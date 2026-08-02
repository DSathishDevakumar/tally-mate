import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getCustomerBalanceComponents, getShopBalanceMaps, runningBalanceOf } from "../services/customerBalance";

// A customer's running balance isn't a stored column — it's opening balance,
// plus confirmed entries not yet rolled into a bill, plus whatever's still
// owed on open bills. Recomputed on read so it's always consistent with
// entries/bills as those modules come online.
export function withRunningBalance<T extends { openingBalance: Prisma.Decimal }>(
  customer: T,
  unbilledTotal: number,
  outstandingBillTotal: number
) {
  return {
    ...customer,
    runningBalance: runningBalanceOf(customer.openingBalance, unbilledTotal, outstandingBillTotal),
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

  const { unbilledMap, billsMap } = await getShopBalanceMaps(shopId);

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

export async function createCustomersBulk(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const { customers } = req.body ?? {};

  if (!Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: "customers must be a non-empty array" });
  }
  if (customers.length > 50) {
    return res.status(400).json({ error: "Too many customers in a single batch (max 50)" });
  }

  for (const [i, c] of customers.entries()) {
    if (typeof c?.name !== "string" || !c.name.trim()) {
      return res.status(400).json({ error: `customers[${i}].name is required` });
    }
  }

  const created = await prisma.$transaction(
    customers.map((c: { name: string; phone?: string }) =>
      prisma.customer.create({
        data: { shopId, name: c.name.trim(), phone: c.phone || null },
      })
    )
  );

  res.status(201).json({ customers: created.map((c) => withRunningBalance(c, 0, 0)) });
}

export async function getCustomer(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, shopId } });
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const { unbilledTotal, outstandingBillTotal } = await getCustomerBalanceComponents(customer.id);
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

  const { unbilledTotal, outstandingBillTotal } = await getCustomerBalanceComponents(customer.id);
  res.json({ customer: withRunningBalance(customer, unbilledTotal, outstandingBillTotal) });
}
