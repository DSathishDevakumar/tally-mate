import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
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
  const { customerId, amount, note, entryDate } = req.body ?? {};

  if (typeof customerId !== "string" || !customerId) {
    return res.status(400).json({ error: "customerId is required" });
  }
  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: "amount must be a positive number" });
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
      source: "MANUAL",
      isConfirmed: true,
      recordedByUserId: req.appUser!.id,
    },
    include: { customer: customerSelect },
  });

  res.status(201).json({ entry });
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
