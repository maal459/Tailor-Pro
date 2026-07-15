import type { ChargeRequest, ChargeResult, PaymentGateway } from "@/lib/billing/gateway";

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
    const c = config();
    return Boolean(c.url && c.merchantUid && c.apiUserId && c.apiKey);
  },

  async charge(req: ChargeRequest): Promise<ChargeResult> {
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
  }
};
