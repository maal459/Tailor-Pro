import { NextResponse } from "next/server";
import { getGateway } from "@/lib/billing/gateway";
import { settleCharge } from "@/lib/billing/charges";

/**
 * Provider callback endpoint for asynchronous mobile-money confirmations.
 *
 *   POST /api/billing/webhook/zaad
 *   POST /api/billing/webhook/edahab
 *
 * Configure these URLs in the ZAAD/eDahab merchant dashboard. The adapter verifies the
 * signature (ZAAD_WEBHOOK_SECRET / EDAHAB_SECRET_KEY) before we trust the payload, then
 * settles the matching charge idempotently.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const gateway = await getGateway(provider.toUpperCase());
  if (!gateway) {
    return NextResponse.json({ ok: false, error: "Unknown provider" }, { status: 404 });
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const parsed = gateway.parseWebhook(rawBody, headers);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Invalid signature or payload" }, { status: 400 });
  }

  const result = await settleCharge({
    chargeId: parsed.reference,
    providerRef: parsed.providerRef,
    success: parsed.success,
    message: parsed.message
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "Charge not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, alreadySettled: result.alreadySettled ?? false });
}
