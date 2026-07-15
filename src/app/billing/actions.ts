"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { payInvoiceSchema } from "@/lib/validators/billing";
import { initiateCharge, type InitiateResult } from "@/lib/billing/charges";

/**
 * Tenant self-service subscription payment. Scoped to the caller's own tenant — the
 * invoice must belong to their tenant. Returns the (serializable) charge result so the
 * UI can show PAID / PENDING / FAILED. Callable even while suspended, so an unpaid tenant
 * can pay to restore access.
 */
export async function payInvoiceAction(input: unknown): Promise<InitiateResult> {
  const session = await requireAuth();

  const parsed = payInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "FAILED", message: parsed.error.issues[0]?.message ?? "Invalid payment details" };
  }

  const invoice = await prismaUnsafe.subscriptionInvoice.findUnique({
    where: { id: parsed.data.invoiceId },
    select: { tenantId: true }
  });
  if (!invoice || invoice.tenantId !== session.tenantId) {
    return { status: "FAILED", message: "Invoice not found." };
  }

  const result = await initiateCharge({
    invoiceId: parsed.data.invoiceId,
    provider: parsed.data.provider,
    payerRef: parsed.data.payerRef,
    initiatedBy: session.email
  });

  revalidatePath("/billing");
  return result;
}
