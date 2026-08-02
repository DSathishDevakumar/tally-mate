import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getCustomerBalanceComponents, runningBalanceOf } from "../services/customerBalance";

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export async function listPayments(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;

  const payments = await prisma.payment.findMany({
    where: { shopId, ...(customerId ? { customerId } : {}) },
    orderBy: { paymentDate: "desc" },
  });

  res.json({ payments });
}

// There's no Bill generation yet (see routes/bills.ts), so a payment always applies
// straight to the customer's running balance rather than to a specific Bill —
// billId stays null. Capped at the current outstanding amount: overpayment/credit
// handling is a separate decision that hasn't been made yet.
export async function createPayment(req: Request, res: Response) {
  const shopId = req.appUser!.shopId!;
  const { customerId, amount, paymentMethod, paymentDate, notes } = req.body ?? {};

  if (typeof customerId !== "string" || !customerId) {
    return res.status(400).json({ error: "customerId is required" });
  }
  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  let parsedDate = new Date();
  if (paymentDate !== undefined) {
    parsedDate = new Date(paymentDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid paymentDate" });
    }
  }

  const customer = await prisma.customer.findFirst({ where: { id: customerId, shopId } });
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const { unbilledTotal, outstandingBillTotal, unappliedPaymentsTotal } = await getCustomerBalanceComponents(
    customer.id
  );
  const outstanding = runningBalanceOf(customer.openingBalance, unbilledTotal, outstandingBillTotal, unappliedPaymentsTotal);

  if (outstanding <= 0) {
    return res.status(409).json({ error: "This customer has no outstanding balance to pay" });
  }
  if (amount > outstanding) {
    return res.status(400).json({ error: `Amount exceeds the outstanding balance of ${outstanding.toFixed(2)}` });
  }

  const payment = await prisma.payment.create({
    data: {
      shopId,
      customerId,
      amount: new Prisma.Decimal(amount),
      paymentMethod: paymentMethod || "cash",
      paymentDate: parsedDate,
      notes: notes || null,
      recordedByUserId: req.appUser!.id,
    },
  });

  res.status(201).json({ payment, runningBalance: outstanding - amount });
}
