import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

// A customer's running balance isn't a stored column — it's opening balance,
// plus confirmed entries not yet rolled into a bill, plus whatever's still
// owed on open bills. Recomputed on read so it's always consistent with
// entries/bills as those modules come online.
function withRunningBalance<T extends { openingBalance: Prisma.Decimal }>(
  customer: T,
  unbilledTotal: number,
  outstandingBillTotal: number
) {
  return {
    ...customer,
    runningBalance: Number(customer.openingBalance) + unbilledTotal + outstandingBillTotal,
  };
}

async function getBalanceComponents(customerId: string) {
  const [unbilled, bills] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { customerId, isConfirmed: true, billId: null },
      _sum: { totalAmount: true },
    }),
    prisma.bill.aggregate({
      where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { totalDue: true, amountPaid: true },
    }),
  ]);

  return {
    unbilledTotal: Number(unbilled._sum.totalAmount ?? 0),
    outstandingBillTotal: Number(bills._sum.totalDue ?? 0) - Number(bills._sum.amountPaid ?? 0),
  };
}

// creditLimit is nullable in the schema (null = "no limit"); openingBalance is not.
function isValidOptionalAmount(value: unknown): value is number | null | undefined {
  if (value === undefined || value === null) return true;
  return typeof value === "number" && Number.isFinite(value);
}

function isValidAmount(value: unknown): value is number | undefined {
  if (value === undefined) return true;
  return typeof value === "number" && Number.isFinite(value);
}

export async function listCustomers(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const activeParam = req.query.active;

  const customers = await prisma.customer.findMany({
    where: {
      shopId,
      ...(activeParam === "true" || activeParam === "false" ? { isActive: activeParam === "true" } : {}),
    },
    orderBy: { name: "asc" },
  });

  const [unbilledByCustomer, billsByCustomer] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ["customerId"],
      where: { shopId, isConfirmed: true, billId: null },
      _sum: { totalAmount: true },
    }),
    prisma.bill.groupBy({
      by: ["customerId"],
      where: { shopId, status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { totalDue: true, amountPaid: true },
    }),
  ]);

  const unbilledMap = new Map(unbilledByCustomer.map((e) => [e.customerId, Number(e._sum.totalAmount ?? 0)]));
  const billsMap = new Map(
    billsByCustomer.map((b) => [b.customerId, Number(b._sum.totalDue ?? 0) - Number(b._sum.amountPaid ?? 0)])
  );

  const result = customers.map((c) =>
    withRunningBalance(c, unbilledMap.get(c.id) ?? 0, billsMap.get(c.id) ?? 0)
  );

  res.json({ customers: result });
}

export async function createCustomer(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const { name, phone, address, creditLimit, openingBalance, notes } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Customer name is required" });
  }
  if (!isValidOptionalAmount(creditLimit)) {
    return res.status(400).json({ error: "creditLimit must be a number" });
  }
  if (!isValidAmount(openingBalance)) {
    return res.status(400).json({ error: "openingBalance must be a number" });
  }

  const customer = await prisma.customer.create({
    data: {
      shopId,
      name: name.trim(),
      phone: phone || null,
      address: address || null,
      creditLimit: creditLimit != null ? new Prisma.Decimal(creditLimit) : null,
      openingBalance: openingBalance != null ? new Prisma.Decimal(openingBalance) : undefined,
      notes: notes || null,
    },
  });

  res.status(201).json({ customer: withRunningBalance(customer, 0, 0) });
}

export async function getCustomer(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, shopId } });
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const { unbilledTotal, outstandingBillTotal } = await getBalanceComponents(customer.id);
  res.json({ customer: withRunningBalance(customer, unbilledTotal, outstandingBillTotal) });
}

export async function updateCustomer(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, shopId } });
  if (!existing) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const { name, phone, address, creditLimit, openingBalance, notes, isActive } = req.body ?? {};

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ error: "Customer name cannot be empty" });
  }
  if (!isValidOptionalAmount(creditLimit)) {
    return res.status(400).json({ error: "creditLimit must be a number" });
  }
  if (!isValidAmount(openingBalance)) {
    return res.status(400).json({ error: "openingBalance must be a number" });
  }

  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(address !== undefined ? { address: address || null } : {}),
      ...(creditLimit !== undefined
        ? { creditLimit: creditLimit != null ? new Prisma.Decimal(creditLimit) : null }
        : {}),
      ...(openingBalance !== undefined ? { openingBalance: new Prisma.Decimal(openingBalance) } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    },
  });

  const { unbilledTotal, outstandingBillTotal } = await getBalanceComponents(customer.id);
  res.json({ customer: withRunningBalance(customer, unbilledTotal, outstandingBillTotal) });
}
