import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

// A customer's running balance isn't a stored column — it's opening balance,
// plus confirmed entries not yet rolled into a bill, plus whatever's still
// owed on open bills, minus payments made directly against the account
// (billId: null — there's no Bill generation yet, so every Payment today is
// applied straight to the running balance). Shared here so both
// customersController and reportsController compute it identically.

export async function getShopBalanceMaps(shopId: string) {
  const [unbilledByCustomer, billsByCustomer, paymentsByCustomer] = await Promise.all([
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
    prisma.payment.groupBy({
      by: ["customerId"],
      where: { shopId, billId: null },
      _sum: { amount: true },
    }),
  ]);

  return {
    unbilledMap: new Map(unbilledByCustomer.map((e) => [e.customerId, Number(e._sum.totalAmount ?? 0)])),
    billsMap: new Map(
      billsByCustomer.map((b) => [b.customerId, Number(b._sum.totalDue ?? 0) - Number(b._sum.amountPaid ?? 0)])
    ),
    unappliedPaymentsMap: new Map(paymentsByCustomer.map((p) => [p.customerId, Number(p._sum.amount ?? 0)])),
  };
}

export async function getCustomerBalanceComponents(customerId: string) {
  const [unbilled, bills, payments] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { customerId, isConfirmed: true, billId: null },
      _sum: { totalAmount: true },
    }),
    prisma.bill.aggregate({
      where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { totalDue: true, amountPaid: true },
    }),
    prisma.payment.aggregate({
      where: { customerId, billId: null },
      _sum: { amount: true },
    }),
  ]);

  return {
    unbilledTotal: Number(unbilled._sum.totalAmount ?? 0),
    outstandingBillTotal: Number(bills._sum.totalDue ?? 0) - Number(bills._sum.amountPaid ?? 0),
    unappliedPaymentsTotal: Number(payments._sum.amount ?? 0),
  };
}

export function runningBalanceOf(
  openingBalance: Prisma.Decimal | number,
  unbilledTotal: number,
  outstandingBillTotal: number,
  unappliedPaymentsTotal = 0
) {
  return Number(openingBalance) + unbilledTotal + outstandingBillTotal - unappliedPaymentsTotal;
}
