/**
 * Live connection test for a mobile-money gateway. Does a REAL charge to the number you
 * pass — so charge your OWN wallet a tiny amount to confirm funds actually land in your
 * merchant account (the account your API keys belong to). Requires the provider's env
 * credentials to be set on this machine/server.
 *
 *   npx tsx scripts/test-gateway-connection.ts <ZAAD|EDAHAB> <payer-number> [amount]
 *
 * Example — charge your own ZAAD wallet $0.01:
 *   npx tsx scripts/test-gateway-connection.ts ZAAD 63XXXXXXX 0.01
 */
import { getGateway, isSandbox, gatewayConfigStatus } from "@/lib/billing/gateway";

async function main() {
  const provider = (process.argv[2] ?? "").toUpperCase();
  const payer = process.argv[3];
  const amount = Number(process.argv[4] ?? "0.01");

  if (!["ZAAD", "EDAHAB"].includes(provider) || !payer) {
    console.error("Usage: npx tsx scripts/test-gateway-connection.ts <ZAAD|EDAHAB> <payer-number> [amount]");
    process.exit(1);
  }
  if (isSandbox()) {
    console.warn("⚠ BILLING_SANDBOX=true — this will FAKE-approve and is NOT a real test. Unset it to test live credentials.\n");
  }

  const status = gatewayConfigStatus().find((s) => s.provider === provider)!;
  console.log(`${provider} credentials on this host:`);
  for (const v of status.vars) console.log(`  ${v.set ? "✓" : "✗"} ${v.name}`);
  if (!status.ready && !isSandbox()) {
    console.error(`\n✗ ${provider} is not fully configured. Set the missing env vars above, then retry.`);
    process.exit(1);
  }

  const gateway = await getGateway(provider);
  console.log(`\nCharging ${amount} USD to ${payer} via ${provider} …`);
  const result = await gateway!.charge({
    tenantId: "connection-test",
    amount,
    currency: "USD",
    payerRef: payer,
    reference: `conntest-${payer.slice(-4)}`,
    description: "Tailor Pro gateway connection test"
  });

  console.log("\nResult:", JSON.stringify(result, null, 2));
  console.log(
    result.success
      ? "\n✓ Gateway reachable and charge approved — the funds should now be in your merchant account."
      : result.status === "PENDING"
        ? "\n⏳ Charge pending — approve on the phone; funds settle on approval (and the webhook confirms it)."
        : "\n✗ Charge failed — check the credentials, endpoint URL, and payer number against your provider's API docs."
  );
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
