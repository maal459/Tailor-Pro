"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";
import { recordPaymentSchema, tenantBillingSchema } from "@/lib/validators/billing";
import {
  generateInvoiceForTenant,
  markInvoicePaid,
  runBillingCycle
} from "@/lib/billing/invoices";
import { GRACE_PERIOD_DAYS } from "@/lib/billing/plans";

function revalidateFinance() {
  revalidatePath("/platform/finance");
  revalidatePath("/platform/tenants");
}

export async function generateInvoiceAction(tenantId: string) {
  const session = await requireSuperAdmin();
  const result = await generateInvoiceForTenant(tenantId, { actorEmail: session.email });

  if (!result.created) {
    if (result.reason === "free-plan") throw new Error("Free-plan tenants are not billed.");
    if (result.reason === "open-invoice") throw new Error("This tenant already has an open invoice.");
  }
  revalidateFinance();
}

export async function recordPaymentAction(input: unknown) {
  const session = await requireSuperAdmin();

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid payment data");
  }

  const { invoiceId, amount, method, gatewayRef, paidAt, notes } = parsed.data;
  const gatewayProvider =
    method === "ZAAD" ? "ZAAD" : method === "EDAHAB" ? "EDAHAB" : null;

  await markInvoicePaid(invoiceId, {
    method,
    amount,
    gatewayProvider,
    gatewayRef: gatewayRef || null,
    paidAt: paidAt ? new Date(paidAt) : undefined,
    recordedBy: session.email,
    notes: notes || null
  });

  revalidateFinance();
}

export async function cancelInvoiceAction(invoiceId: string) {
  const session = await requireSuperAdmin();

  const invoice = await prismaUnsafe.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "PAID") throw new Error("A paid invoice cannot be cancelled.");

  await prismaUnsafe.subscriptionInvoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" }
  });

  await logActivity({
    tenantId: invoice.tenantId,
    actorUserId: session.userId,
    entityType: "SubscriptionInvoice",
    entityId: invoiceId,
    action: "update",
    message: `Subscription invoice cancelled by ${session.email}`
  });

  revalidateFinance();
}

export async function runBillingCycleAction() {
  await requireSuperAdmin();
  const report = await runBillingCycle({ graceDays: GRACE_PERIOD_DAYS });
  revalidateFinance();
  return report;
}

export async function updateTenantBillingAction(tenantId: string, input: unknown) {
  const session = await requireSuperAdmin();

  const parsed = tenantBillingSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid billing data");
  }

  const provider = parsed.data.gatewayProvider ? parsed.data.gatewayProvider : null;
  const payerRef = parsed.data.gatewayPayerRef?.trim() || null;

  // Guard: auto-collect needs a provider and a wallet to charge.
  if (parsed.data.autoCollect && (!provider || !payerRef)) {
    throw new Error("Automatic collection needs a gateway provider and a payer wallet number.");
  }

  const existing = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) throw new Error("Tenant not found");

  await prismaUnsafe.tenant.update({
    where: { id: tenantId },
    data: {
      billingCycle: parsed.data.billingCycle,
      autoCollect: parsed.data.autoCollect,
      gatewayProvider: provider,
      gatewayPayerRef: payerRef
    }
  });

  await logActivity({
    tenantId,
    actorUserId: session.userId,
    entityType: "Tenant",
    entityId: tenantId,
    action: "update",
    message: `Billing settings updated (${parsed.data.billingCycle}, auto-collect ${parsed.data.autoCollect ? "on" : "off"}${provider ? `, ${provider}` : ""})`
  });

  revalidatePath("/platform/tenants");
  revalidatePath(`/platform/tenants/${tenantId}/edit`);
  revalidateFinance();
}
