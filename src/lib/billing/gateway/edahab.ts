import { createHash } from "crypto";
import type { ChargeRequest, ChargeResult, PaymentGateway } from "@/lib/billing/gateway";

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
    const c = config();
    return Boolean(c.url && c.apiKey && c.secretKey && c.agentCode);
  },

  async charge(req: ChargeRequest): Promise<ChargeResult> {
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
  }
};
