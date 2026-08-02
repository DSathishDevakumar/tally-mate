import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { extractPhotoEntries, extractVoiceEntry } from "../services/geminiService";
import { findBestMatches } from "../utils/fuzzyMatch";

const ENTRY_SOURCES = ["MANUAL", "VOICE", "PHOTO"] as const;
type EntrySourceValue = (typeof ENTRY_SOURCES)[number];

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidSource(value: unknown): value is EntrySourceValue {
  return typeof value === "string" && (ENTRY_SOURCES as readonly string[]).includes(value);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const customerSelect = { select: { id: true, name: true } } as const;

interface CustomerNameRow {
  id: string;
  name: string;
}

/** Fuzzy-matches an AI-extracted name against a shop's customers for draft review screens. */
function matchCustomerName(name: string | null, customers: CustomerNameRow[]) {
  const matches = name ? findBestMatches(name, customers, (c) => c.name) : [];
  const [best] = matches;
  const matchedCustomer = best && best.score >= 0.6 ? { id: best.item.id, name: best.item.name, score: best.score } : null;
  return {
    matchedCustomer,
    suggestedCustomers: matches.filter((m) => m.score > 0).map((m) => ({ id: m.item.id, name: m.item.name, score: m.score })),
  };
}

export async function listEntries(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  if (Number.isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      shopId,
      entryDate: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) },
    },
    include: { customer: customerSelect },
    orderBy: { createdAt: "desc" },
  });

  res.json({ entries });
}

export async function createEntry(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const { customerId, amount, note, entryDate, source, rawVoiceText, aiConfidence } = req.body ?? {};

  if (typeof customerId !== "string" || !customerId) {
    return res.status(400).json({ error: "customerId is required" });
  }
  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (source !== undefined && !isValidSource(source)) {
    return res.status(400).json({ error: "source must be one of MANUAL, VOICE, PHOTO" });
  }
  if (aiConfidence !== undefined && (typeof aiConfidence !== "number" || aiConfidence < 0 || aiConfidence > 1)) {
    return res.status(400).json({ error: "aiConfidence must be a number between 0 and 1" });
  }

  const customer = await prisma.customer.findFirst({ where: { id: customerId, shopId } });
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  let parsedDate = new Date();
  if (entryDate !== undefined) {
    parsedDate = new Date(entryDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid entryDate" });
    }
  }

  const entry = await prisma.ledgerEntry.create({
    data: {
      shopId,
      customerId,
      totalAmount: new Prisma.Decimal(amount),
      note: note || null,
      entryDate: parsedDate,
      // The AI draft (source: VOICE/PHOTO) is never saved on its own — this create
      // call only ever happens after a human reviews and confirms it, so
      // isConfirmed is always true regardless of source.
      source: (source as EntrySourceValue | undefined) ?? "MANUAL",
      rawVoiceText: rawVoiceText || null,
      aiConfidence: aiConfidence !== undefined ? new Prisma.Decimal(aiConfidence) : null,
      isConfirmed: true,
      recordedByUserId: req.appUser!.id,
    },
    include: { customer: customerSelect },
  });

  res.status(201).json({ entry });
}

export async function createEntriesBulk(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const { entries } = req.body ?? {};

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "entries must be a non-empty array" });
  }
  if (entries.length > 100) {
    return res.status(400).json({ error: "Too many entries in a single batch (max 100)" });
  }

  for (const [i, e] of entries.entries()) {
    if (typeof e?.customerId !== "string" || !e.customerId) {
      return res.status(400).json({ error: `entries[${i}].customerId is required` });
    }
    if (!isValidAmount(e.amount)) {
      return res.status(400).json({ error: `entries[${i}].amount must be a positive number` });
    }
    if (e.source !== undefined && !isValidSource(e.source)) {
      return res.status(400).json({ error: `entries[${i}].source must be one of MANUAL, VOICE, PHOTO` });
    }
    if (e.aiConfidence !== undefined && (typeof e.aiConfidence !== "number" || e.aiConfidence < 0 || e.aiConfidence > 1)) {
      return res.status(400).json({ error: `entries[${i}].aiConfidence must be a number between 0 and 1` });
    }
  }

  const customerIds = [...new Set(entries.map((e) => e.customerId as string))];
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds }, shopId },
    select: { id: true },
  });
  const validIds = new Set(customers.map((c) => c.id));
  const missing = customerIds.filter((id) => !validIds.has(id));
  if (missing.length > 0) {
    return res.status(404).json({ error: `Customer(s) not found: ${missing.join(", ")}` });
  }

  const created = await prisma.$transaction(
    entries.map((e) =>
      prisma.ledgerEntry.create({
        data: {
          shopId,
          customerId: e.customerId,
          totalAmount: new Prisma.Decimal(e.amount),
          note: e.note || null,
          entryDate: new Date(),
          source: (e.source as EntrySourceValue | undefined) ?? "MANUAL",
          aiConfidence: e.aiConfidence !== undefined ? new Prisma.Decimal(e.aiConfidence) : null,
          isConfirmed: true,
          recordedByUserId: req.appUser!.id,
        },
        include: { customer: customerSelect },
      })
    )
  );

  res.status(201).json({ entries: created });
}

export async function draftVoiceEntry(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "An audio file is required (field name 'audio')" });
  }

  let extraction;
  try {
    extraction = await extractVoiceEntry(file.buffer, file.mimetype);
  } catch (err) {
    console.error("Gemini voice extraction failed", err);
    return res.status(502).json({ error: "Could not process the recording. Please try again." });
  }

  const customers = await prisma.customer.findMany({
    where: { shopId, isActive: true },
    select: { id: true, name: true },
  });

  const { matchedCustomer, suggestedCustomers } = matchCustomerName(extraction.customerName, customers);

  res.json({
    draft: {
      transcript: extraction.transcript,
      extractedCustomerName: extraction.customerName,
      amount: extraction.amount,
      note: extraction.note,
      confidence: extraction.confidence,
      matchedCustomer,
      suggestedCustomers,
    },
  });
}

export async function draftPhotoEntries(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "An image file is required (field name 'photo')" });
  }

  let extraction;
  try {
    extraction = await extractPhotoEntries(file.buffer, file.mimetype);
  } catch (err) {
    console.error("Gemini photo extraction failed", err);
    return res.status(502).json({ error: "Could not process the photo. Please try again." });
  }

  if (extraction.length === 0) {
    return res.status(422).json({ error: "No entries were recognized in that photo. Try a clearer photo." });
  }

  const customers = await prisma.customer.findMany({
    where: { shopId, isActive: true },
    select: { id: true, name: true },
  });

  const rows = extraction.map((row) => {
    const { matchedCustomer, suggestedCustomers } = matchCustomerName(row.customerName, customers);
    return {
      extractedCustomerName: row.customerName,
      amount: row.amount,
      note: row.note,
      confidence: row.confidence,
      matchedCustomer,
      suggestedCustomers,
    };
  });

  res.json({ rows });
}

export async function updateEntry(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const existing = await prisma.ledgerEntry.findFirst({ where: { id: req.params.id, shopId } });
  if (!existing) {
    return res.status(404).json({ error: "Entry not found" });
  }
  if (existing.billId) {
    return res.status(409).json({ error: "Entry has already been billed and can't be edited" });
  }

  const { amount, note } = req.body ?? {};
  if (amount !== undefined && !isValidAmount(amount)) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const entry = await prisma.ledgerEntry.update({
    where: { id: existing.id },
    data: {
      ...(amount !== undefined ? { totalAmount: new Prisma.Decimal(amount) } : {}),
      ...(note !== undefined ? { note: note || null } : {}),
    },
    include: { customer: customerSelect },
  });

  res.json({ entry });
}

export async function deleteEntry(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const existing = await prisma.ledgerEntry.findFirst({ where: { id: req.params.id, shopId } });
  if (!existing) {
    return res.status(404).json({ error: "Entry not found" });
  }
  if (existing.billId) {
    return res.status(409).json({ error: "Entry has already been billed and can't be deleted" });
  }

  await prisma.ledgerEntry.delete({ where: { id: existing.id } });
  res.status(204).send();
}
