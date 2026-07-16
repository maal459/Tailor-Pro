import { createHmac, timingSafeEqual } from "crypto";
import { isSandbox } from "@/lib/billing/gateway";
import type {
  ChargeRequest,
  ChargeResult,
  ParsedWebhook,
  PaymentGateway
} from "@/lib/billing/gateway";

/**
 * ZAAD (Telesom) adapter.
 *
 * ZAAD is most commonly reached through the WaafiPay pre-authorize API, which also
 * serves EVC Plus and eDahab. To go live, obtain a merchant account and set:
 *
 *   ZAAD_API_URL      e.g. https://api.waafipay.net/asm
 *   ZAAD_MERCHANT_UID
 *   ZAAD_API_USER_ID
 *   ZAAD_API_KEY
 *
 * With those present `isConfigured()` flips to true and `charge()` issues a real debit
 * (a USSD push the tenant approves on their phone). Everything below the env check is
 * the integration point; the request/response shape follows WaafiPay's `preAuthorize`.
 */

function config() {
  return {
    url: process.env.ZAAD_API_URL,
    merchantUid: process.env.ZAAD_MERCHANT_UID,
    apiUserId: process.env.ZAAD_API_USER_ID,
    apiKey: process.env.ZAAD_API_KEY
  };
}

export const zaadGateway: PaymentGateway = {
  provider: "ZAAD",

  isConfigured() {
    if (isSandbox()) return true;
    const c = config();
    return Boolean(c.url && c.merchantUid && c.apiUserId && c.apiKey);
  },

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (isSandbox()) {
      return {
        success: true,
        status: "PAID",
        gatewayRef: `SANDBOX-ZAAD-${req.reference.slice(-8)}`,
        message: "Sandbox approval (test mode — no real charge)"
      };
    }
    const c = config();
    if (!this.isConfigured()) {
      return {
        success: false,
        status: "FAILED",
        message: "ZAAD gateway is not configured. Set ZAAD_* env vars to enable automatic collection."
      };
    }

    try {
      const payload = {
        schemaVersion: "1.0",
        requestId: req.reference,
        timestamp: new Date().toISOString(),
        channelName: "WEB",
        serviceName: "API_PREAUTHORIZE",
        serviceParams: {
          merchantUid: c.merchantUid,
          apiUserId: c.apiUserId,
          apiKey: c.apiKey,
          paymentMethod: "MWALLET_ACCOUNT",
          payerInfo: { accountNo: req.payerRef },
          transactionInfo: {
            referenceId: req.reference,
            invoiceId: req.reference,
            amount: req.amount.toFixed(2),
            currency: req.currency,
            description: req.description ?? "Tailor Pro subscription"
          }
        }
      };

      const res = await fetch(c.url as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as {
        responseCode?: string;
        responseMsg?: string;
        params?: { transactionId?: string };
      };

      // WaafiPay returns responseCode "2001" on a successful/approved debit.
      if (data.responseCode === "2001") {
        return {
          success: true,
          status: "PAID",
          gatewayRef: data.params?.transactionId,
          message: "ZAAD payment approved"
        };
      }
      return {
        success: false,
        status: "FAILED",
        message: data.responseMsg ?? `ZAAD declined (code ${data.responseCode ?? "unknown"})`
      };
    } catch (error) {
      return {
        success: false,
        status: "FAILED",
        message: error instanceof Error ? `ZAAD request failed: ${error.message}` : "ZAAD request failed"
      };
    }
  },

  parseWebhook(rawBody: string, headers: Record<string, string>): ParsedWebhook | null {
    // Verify the callback is genuinely from ZAAD before trusting it. WaafiPay signs the
    // raw body with an HMAC-SHA256 using your webhook secret, sent in the `x-signature`
    // header. Without ZAAD_WEBHOOK_SECRET we cannot verify, so we reject.
    const secret = process.env.ZAAD_WEBHOOK_SECRET;
    if (!secret) return null;

    const provided = headers["x-signature"] || headers["x-waafi-signature"] || "";
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!safeEqualHex(provided, expected)) return null;

    try {
      const data = JSON.parse(rawBody) as {
        responseCode?: string;
        responseMsg?: string;
        params?: { referenceId?: string; transactionId?: string };
      };
      const reference = data.params?.referenceId;
      if (!reference) return null;
      return {
        reference,
        providerRef: data.params?.transactionId,
        success: data.responseCode === "2001",
        message: data.responseMsg
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
