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

  const { unbilledMap, billsMap, unappliedPaymentsMap } = await getShopBalanceMaps(shopId);

  const ranked = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      isActive: c.isActive,
      runningBalance: runningBalanceOf(
        c.openingBalance,
        unbilledMap.get(c.id) ?? 0,
        billsMap.get(c.id) ?? 0,
        unappliedPaymentsMap.get(c.id) ?? 0
      ),
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

  const [entries, payments, { unbilledTotal, outstandingBillTotal, unappliedPaymentsTotal }] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { customerId: customer.id, shopId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.payment.findMany({
      where: { customerId: customer.id, shopId },
      orderBy: { paymentDate: "desc" },
    }),
    getCustomerBalanceComponents(customer.id),
  ]);

  // Historical totals over every entry ever logged for this customer — distinct from
  // runningBalance (unbilled + outstanding-bill formula), which will diverge from this
  // once Billing actually rolls entries into bills. They're computed independently on
  // purpose so the statement stays correct once that happens.
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.totalAmount), 0);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const dateRange =
    entries.length > 0 ? { from: entries[entries.length - 1]!.entryDate, to: entries[0]!.entryDate } : null;

  // A single chronological timeline of purchases and payments — the running balance
  // already nets payments out (see customerBalance.ts), but until now nothing
  // surfaced the payment itself, so the statement showed the balance drop with no
  // line item explaining it.
  const timeline = [
    ...entries.map((e) => ({
      type: "PURCHASE" as const,
      id: e.id,
      date: e.entryDate,
      amount: e.totalAmount,
      note: e.note,
      billId: e.billId,
    })),
    ...payments.map((p) => ({
      type: "PAYMENT" as const,
      id: p.id,
      date: p.paymentDate,
      amount: p.amount,
      note: p.notes,
      paymentMethod: p.paymentMethod,
      billId: p.billId,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      isActive: customer.isActive,
      openingBalance: customer.openingBalance,
      runningBalance: runningBalanceOf(customer.openingBalance, unbilledTotal, outstandingBillTotal, unappliedPaymentsTotal),
    },
    summary: { totalCredit, totalPaid, entryCount: entries.length, dateRange, unbilledTotal, outstandingBillTotal, unappliedPaymentsTotal },
    entries: timeline,
  });
}
