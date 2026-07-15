import { prismaUnsafe } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { getGateway, PROVIDER_METHOD, type GatewayProvider } from "@/lib/billing/gateway";
import { markInvoicePaid } from "@/lib/billing/invoices";

/**
 * Orchestrates online mobile-money payments (ZAAD / eDahab) against subscription
 * invoices. Because approval is asynchronous, every attempt is persisted as a
 * `GatewayCharge` (PENDING) whose id is the reference handed to the gateway. Settlement
 * is idempotent and happens either synchronously (immediate approval) or via the
 * provider webhook (`settleCharge`, called from the webhook route).
 */

export type InitiateResult =
  | { status: "PAID"; chargeId: string; message: string }
  | { status: "PENDING"; chargeId: string; message: string }
  | { status: "FAILED"; chargeId?: string; message: string };

export async function initiateCharge(input: {
  invoiceId: string;
  provider?: string | null;
  /** Wallet/phone to charge; falls back to the tenant's saved gatewayPayerRef. */
  payerRef?: string | null;
  initiatedBy?: string | null;
}): Promise<InitiateResult> {
  const invoice = await prismaUnsafe.subscriptionInvoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) return { status: "FAILED", message: "Invoice not found." };
  if (invoice.status === "PAID") return { status: "FAILED", message: "This invoice is already paid." };
  if (invoice.status === "CANCELLED") return { status: "FAILED", message: "This invoice was cancelled." };

  const tenant = await prismaUnsafe.tenant.findUnique({ where: { id: invoice.tenantId } });
  if (!tenant) return { status: "FAILED", message: "Tenant not found." };

  const provider = (input.provider || tenant.gatewayProvider || "").toUpperCase();
  const payerRef = (input.payerRef || tenant.gatewayPayerRef || "").trim();
  const gateway = await getGateway(provider);

  if (!gateway) return { status: "FAILED", message: "Choose a payment method (ZAAD or eDahab)." };
  if (!payerRef) return { status: "FAILED", message: "Enter the wallet / phone number to charge." };
  if (!gateway.isConfigured()) {
    return {
      status: "FAILED",
      message: `${provider} online payment isn't available yet. Please pay manually or try again later.`
    };
  }

  // Persist the attempt first — its id is the reference the gateway echoes back.
  const charge = await prismaUnsafe.gatewayCharge.create({
    data: {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      provider,
      payerRef,
      amount: toNumber(invoice.amount),
      currency: invoice.currency,
      status: "PENDING",
      initiatedBy: input.initiatedBy ?? null
    }
  });

  const result = await gateway.charge({
    tenantId: invoice.tenantId,
    amount: toNumber(invoice.amount),
    currency: invoice.currency,
    payerRef,
    reference: charge.id,
    description: `Tailor Pro ${invoice.plan} subscription`
  });

  if (result.success && result.status === "PAID") {
    await settleCharge({ chargeId: charge.id, providerRef: result.gatewayRef, success: true, message: result.message });
    return { status: "PAID", chargeId: charge.id, message: result.message };
  }

  if (result.status === "PENDING") {
    await prismaUnsafe.gatewayCharge.update({
      where: { id: charge.id },
      data: { providerRef: result.gatewayRef ?? null, message: result.message, status: "PENDING" }
    });
    return { status: "PENDING", chargeId: charge.id, message: result.message };
  }

  await prismaUnsafe.gatewayCharge.update({
    where: { id: charge.id },
    data: { status: "FAILED", message: result.message }
  });
  return { status: "FAILED", chargeId: charge.id, message: result.message };
}

/**
 * Settles a charge attempt. Idempotent: a charge already marked SUCCESS is a no-op, so a
 * duplicate webhook (or a webhook racing the synchronous result) never double-credits.
 * On success it marks the invoice paid (which advances the tenant's paid-through date and
 * reactivates a tenant suspended for non-payment).
 */
export async function settleCharge(input: {
  chargeId: string;
  providerRef?: string | null;
  success: boolean;
  message?: string;
}): Promise<{ ok: boolean; alreadySettled?: boolean }> {
  const charge = await prismaUnsafe.gatewayCharge.findUnique({ where: { id: input.chargeId } });
  if (!charge) return { ok: false };
  if (charge.status === "SUCCESS") return { ok: true, alreadySettled: true };

  if (!input.success) {
    await prismaUnsafe.gatewayCharge.update({
      where: { id: charge.id },
      data: {
        status: "FAILED",
        providerRef: input.providerRef ?? charge.providerRef,
        message: input.message ?? charge.message
      }
    });
    return { ok: true };
  }

  const invoice = await prismaUnsafe.subscriptionInvoice.findUnique({ where: { id: charge.invoiceId } });
  if (invoice && invoice.status !== "PAID" && invoice.status !== "CANCELLED") {
    await markInvoicePaid(charge.invoiceId, {
      method: PROVIDER_METHOD[charge.provider as GatewayProvider] ?? "OTHER",
      amount: toNumber(charge.amount),
      gatewayProvider: charge.provider,
      gatewayRef: input.providerRef ?? charge.providerRef,
      recordedBy: charge.initiatedBy ?? "gateway",
      notes: `Online payment via ${charge.provider}`
    });
  }

  await prismaUnsafe.gatewayCharge.update({
    where: { id: charge.id },
    data: {
      status: "SUCCESS",
      providerRef: input.providerRef ?? charge.providerRef,
      message: input.message ?? "Paid"
    }
  });
  return { ok: true };
}
