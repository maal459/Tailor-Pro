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

/** Normalised result of a provider webhook/callback after signature verification. */
export type ParsedWebhook = {
  /** The reference we sent on `charge()` (the GatewayCharge id), echoed back. */
  reference: string;
  /** Provider transaction id, if present. */
  providerRef?: string;
  success: boolean;
  message?: string;
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
  /**
   * Verifies a webhook/callback from the provider and extracts the settlement result.
   * Returns null if the signature is invalid or the payload can't be understood (the
   * route then ignores it). Provider-specific — implemented per adapter.
   */
  parseWebhook(rawBody: string, headers: Record<string, string>): ParsedWebhook | null;
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

export const ALL_PROVIDERS: GatewayProvider[] = ["ZAAD", "EDAHAB"];

/**
 * Sandbox / test mode. When `BILLING_SANDBOX=true`, both gateways report as configured
 * and `charge()` auto-approves without a network call — so the full online-payment flow
 * can be exercised without real ZAAD/eDahab credentials. MUST be off (unset) in a real
 * production deployment, or tenants could "pay" without actually paying.
 */
export function isSandbox(): boolean {
  // Hard guard: sandbox can NEVER be active in production, even if the env var is set —
  // otherwise a stray BILLING_SANDBOX would let tenants "pay" without actually paying.
  if (process.env.NODE_ENV === "production") return false;
  return process.env.BILLING_SANDBOX === "true";
}

/** The subset of providers whose credentials are present (available for live charges). */
export async function configuredProviders(): Promise<GatewayProvider[]> {
  if (isSandbox()) return [...ALL_PROVIDERS];
  const out: GatewayProvider[] = [];
  for (const provider of ALL_PROVIDERS) {
    const gateway = await getGateway(provider);
    if (gateway?.isConfigured()) out.push(provider);
  }
  return out;
}

/** Env vars each provider needs to go live (money is credited to the account these belong to). */
export const REQUIRED_ENV: Record<GatewayProvider, string[]> = {
  ZAAD: ["ZAAD_API_URL", "ZAAD_MERCHANT_UID", "ZAAD_API_USER_ID", "ZAAD_API_KEY"],
  EDAHAB: ["EDAHAB_API_URL", "EDAHAB_API_KEY", "EDAHAB_SECRET_KEY", "EDAHAB_AGENT_CODE"]
};

/** Env var used to verify incoming webhooks per provider. */
export const WEBHOOK_ENV: Record<GatewayProvider, string> = {
  ZAAD: "ZAAD_WEBHOOK_SECRET",
  EDAHAB: "EDAHAB_SECRET_KEY"
};

export type GatewayConfigStatus = {
  provider: GatewayProvider;
  vars: Array<{ name: string; set: boolean }>;
  webhookVar: string;
  webhookSet: boolean;
  ready: boolean;
};

/**
 * Reports which required env vars are present per provider — presence only, never the
 * values. Used to render a setup checklist so the operator knows exactly what's missing.
 */
export function gatewayConfigStatus(): GatewayConfigStatus[] {
  return ALL_PROVIDERS.map((provider) => {
    const vars = REQUIRED_ENV[provider].map((name) => ({ name, set: Boolean(process.env[name]) }));
    return {
      provider,
      vars,
      webhookVar: WEBHOOK_ENV[provider],
      webhookSet: Boolean(process.env[WEBHOOK_ENV[provider]]),
      ready: vars.every((v) => v.set)
    };
  });
}
