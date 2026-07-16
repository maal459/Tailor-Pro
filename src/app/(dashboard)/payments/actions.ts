"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { createPaymentSchema, updatePaymentSchema } from "@/lib/validators/payment";
import { paymentRepository } from "@/lib/repositories/payment-repository";
import { financeService } from "@/lib/services/finance-service";
import { prisma } from "@/lib/db/prisma";

export async function createPaymentAction(input: unknown) {
  const session = await requireAuth();
  const parsed = createPaymentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment data");
  }

  const totals = await financeService.orderTotals(session.tenantId, parsed.data.orderId);
  if (!totals) throw new Error("Order not found");

  const projectedBalance = totals.balance - parsed.data.amount;
  if (projectedBalance < -0.01) throw new Error("Overpayment is not allowed for this order");

  await paymentRepository.create({
    tenantId: session.tenantId,
    orderId: parsed.data.orderId,
    customerId: parsed.data.customerId,
    paymentMethodId: parsed.data.paymentMethodId,
    amount: parsed.data.amount,
    referenceNo: parsed.data.referenceNo,
    notes: parsed.data.notes,
    receivedById: session.userId
  });

  revalidatePath("/payments");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/ledger");
}

export async function updatePaymentAction(paymentId: string, input: unknown) {
  const session = await requireAuth();
  const parsed = updatePaymentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment data");
  }

  const existing = await prisma.payment.findFirst({
    where: { id: paymentId, tenantId: session.tenantId }
  });
  if (!existing) {
    throw new Error("Payment not found");
  }

  await prisma.payment.updateMany({
    where: { id: paymentId, tenantId: session.tenantId },
    data: {
      amount: parsed.data.amount,
      paymentMethodId: parsed.data.paymentMethodId,
      referenceNo: parsed.data.referenceNo ?? null,
      notes: parsed.data.notes ?? null
    }
  });

  revalidatePath("/payments");
  revalidatePath(`/payments/${paymentId}/edit`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/ledger");
}

export async function deletePaymentAction(paymentId: string) {
  const session = await requireAuth();

  const existing = await prisma.payment.findFirst({
    where: { id: paymentId, tenantId: session.tenantId }
  });
  if (!existing) {
    throw new Error("Payment not found");
  }

  await prisma.payment.deleteMany({ where: { id: paymentId, tenantId: session.tenantId } });

  revalidatePath("/payments");
  revalidatePath("/payments/history");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/ledger");
  revalidatePath("/receivables");
}
