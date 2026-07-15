import type { SubscriptionPaymentMethod } from "@prisma/client";

/**
 * Mobile-money gateway abstraction.
 *
 * Tailor Pro can collect subscription fees from tenants automatically through Somali
 * mobile-money wallets (ZAAD by Telesom, eDahab by Somtel/Premier). Each provider is an
 * adapter implementing `PaymentGateway`. Until real credentials are supplied via env
 * vars, `isConfigured()` returns false and `charge()` fails gracefully, so the rest of
 * the billing engine keeps working with manual payments. Wiring a live gateway is then a
 * matter of filling in env vars — no code changes elsewhere. See README-MULTI-TENANT.md.
 */

export type GatewayProvider = "ZAAD" | "EDAHAB";

export type ChargeRequest = {
  tenantId: string;
  amount: number;
  currency: string;
  /** Wallet / phone number to debit (tenant.gatewayPayerRef). */
  payerRef: string;
  /** Our reference for reconciliation — typically the invoice id. */
  reference: string;
  description?: string;
};

export type ChargeResult = {
  success: boolean;
  status: "PAID" | "PENDING" | "FAILED";
  /** Provider-side transaction id, stored on SubscriptionPayment.gatewayRef. */
  gatewayRef?: string;
  message: string;
};

export interface PaymentGateway {
  readonly provider: GatewayProvider;
  /** True only when all required credentials are present in the environment. */
  isConfigured(): boolean;
  /**
   * Initiates a debit against the payer's wallet. Operational failures (declined,
   * timeout, not configured) are returned as `{ success: false }` rather than thrown,
   * so callers never crash a billing run on a gateway hiccup.
   */
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/** Maps a provider to the SubscriptionPayment.method enum value it records under. */
export const PROVIDER_METHOD: Record<GatewayProvider, SubscriptionPaymentMethod> = {
  ZAAD: "ZAAD",
  EDAHAB: "EDAHAB"
};

/**
 * Resolves the adapter for a provider, or null for an unknown/empty value.
 * Imports are lazy so the adapters (and their env reads) load only when used.
 */
export async function getGateway(provider: string | null | undefined): Promise<PaymentGateway | null> {
  switch (provider) {
    case "ZAAD": {
      const { zaadGateway } = await import("@/lib/billing/gateway/zaad");
      return zaadGateway;
    }
    case "EDAHAB": {
      const { edahabGateway } = await import("@/lib/billing/gateway/edahab");
      return edahabGateway;
    }
    default:
      return null;
  }
}
