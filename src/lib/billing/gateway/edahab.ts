import { createHash, timingSafeEqual } from "crypto";
import { isSandbox } from "@/lib/billing/gateway";
import type {
  ChargeRequest,
  ChargeResult,
  ParsedWebhook,
  PaymentGateway
} from "@/lib/billing/gateway";

/**
 * eDahab (Somtel / Premier) adapter.
 *
 * eDahab exposes its own hash-signed REST API. To go live, obtain agent credentials
 * and set:
 *
 *   EDAHAB_API_URL     e.g. https://edahab.net/api/api
 *   EDAHAB_API_KEY
 *   EDAHAB_SECRET_KEY  (used to SHA-256 sign each request)
 *   EDAHAB_AGENT_CODE
 *
 * With those present `isConfigured()` flips to true and `charge()` issues a real invoice
 * the tenant approves on their phone. The request/response shape follows eDahab's
 * `IssueInvoice`; the signature is SHA-256 over the JSON body concatenated with the
 * secret key, sent as the `hash` query parameter.
 */

function config() {
  return {
    url: process.env.EDAHAB_API_URL,
    apiKey: process.env.EDAHAB_API_KEY,
    secretKey: process.env.EDAHAB_SECRET_KEY,
    agentCode: process.env.EDAHAB_AGENT_CODE
  };
}

export const edahabGateway: PaymentGateway = {
  provider: "EDAHAB",

  isConfigured() {
    if (isSandbox()) return true;
    const c = config();
    return Boolean(c.url && c.apiKey && c.secretKey && c.agentCode);
  },

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (isSandbox()) {
      return {
        success: true,
        status: "PAID",
        gatewayRef: `SANDBOX-EDAHAB-${req.reference.slice(-8)}`,
        message: "Sandbox approval (test mode — no real charge)"
      };
    }
    const c = config();
    if (!this.isConfigured()) {
      return {
        success: false,
        status: "FAILED",
        message: "eDahab gateway is not configured. Set EDAHAB_* env vars to enable automatic collection."
      };
    }

    try {
      const body = {
        apiKey: c.apiKey,
        edahabNumber: req.payerRef,
        amount: Number(req.amount.toFixed(2)),
        agentCode: c.agentCode,
        currency: req.currency,
        referenceId: req.reference
      };
      const hash = createHash("sha256")
        .update(JSON.stringify(body) + c.secretKey)
        .digest("hex")
        .toUpperCase();

      const res = await fetch(`${c.url}/IssueInvoice?hash=${hash}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as {
        InvoiceStatus?: string;
        TransactionId?: string;
        StatusCode?: number;
        StatusDescription?: string;
      };

      // eDahab returns InvoiceStatus "Paid" once the customer approves the debit.
      if (data.InvoiceStatus === "Paid") {
        return {
          success: true,
          status: "PAID",
          gatewayRef: data.TransactionId,
          message: "eDahab payment approved"
        };
      }
      if (data.StatusCode === 0 || data.InvoiceStatus === "Pending") {
        return {
          success: false,
          status: "PENDING",
          gatewayRef: data.TransactionId,
          message: "eDahab invoice issued, awaiting customer approval"
        };
      }
      return {
        success: false,
        status: "FAILED",
        message: data.StatusDescription ?? "eDahab declined the payment"
      };
    } catch (error) {
      return {
        success: false,
        status: "FAILED",
        message: error instanceof Error ? `eDahab request failed: ${error.message}` : "eDahab request failed"
      };
    }
  },

  parseWebhook(rawBody: string): ParsedWebhook | null {
    // eDahab signs its payment notification: SHA-256 over the raw body concatenated with
    // your secret key, sent back as `hash` in the payload. We recompute and compare
    // before trusting it. Without EDAHAB_SECRET_KEY we cannot verify, so we reject.
    const secret = process.env.EDAHAB_SECRET_KEY;
    if (!secret) return null;

    try {
      const data = JSON.parse(rawBody) as {
        referenceId?: string;
        TransactionId?: string;
        InvoiceStatus?: string;
        hash?: string;
      };
      const reference = data.referenceId;
      if (!reference || !data.hash) return null;

      // Recompute over the body with the hash field removed, then + secret.
      const { hash, ...unsigned } = data;
      const expected = createHash("sha256")
        .update(JSON.stringify(unsigned) + secret)
        .digest("hex")
        .toUpperCase();
      if (!safeEqualHex(hash.toUpperCase(), expected)) return null;

      return {
        reference,
        providerRef: data.TransactionId,
        success: data.InvoiceStatus === "Paid",
        message: data.InvoiceStatus
      };
    } catch {
      return null;
    }
  }
};

/** Constant-time compare of two hex strings; false on any length/format mismatch. */
function safeEqualHex(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
