import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getCustomerBalanceComponents, getShopBalanceMaps, runningBalanceOf } from "../services/customerBalance";

export async function listCustomerReports(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;

  const customers = await prisma.customer.findMany({
    where: { shopId },
    select: { id: true, name: true, phone: true, isActive: true, openingBalance: true },
    orderBy: { name: "asc" },
  });

  const { unbilledMap, billsMap } = await getShopBalanceMaps(shopId);

  const ranked = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      isActive: c.isActive,
      runningBalance: runningBalanceOf(c.openingBalance, unbilledMap.get(c.id) ?? 0, billsMap.get(c.id) ?? 0),
    }))
    .sort((a, b) => b.runningBalance - a.runningBalance);

  res.json({ customers: ranked });
}

export async function getCustomerStatement(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const customer = await prisma.customer.findFirst({ where: { id: req.params.id, shopId } });
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const [entries, { unbilledTotal, outstandingBillTotal }] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { customerId: customer.id, shopId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    }),
    getCustomerBalanceComponents(customer.id),
  ]);

  // Historical totals over every entry ever logged for this customer — distinct from
  // runningBalance (unbilled + outstanding-bill formula), which will diverge from this
  // once Billing actually rolls entries into bills. They're computed independently on
  // purpose so the statement stays correct once that happens.
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.totalAmount), 0);
  const dateRange =
    entries.length > 0 ? { from: entries[entries.length - 1]!.entryDate, to: entries[0]!.entryDate } : null;

  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      isActive: customer.isActive,
      openingBalance: customer.openingBalance,
      runningBalance: runningBalanceOf(customer.openingBalance, unbilledTotal, outstandingBillTotal),
    },
    summary: { totalCredit, entryCount: entries.length, dateRange, unbilledTotal, outstandingBillTotal },
    entries,
  });
}
