/**
 * Smoke test for the online-payment (gateway charge) flow: attempt initiation without
 * credentials, then exercise webhook settlement (success, idempotency, failure) by
 * driving settleCharge directly. Self-cleaning; safe to run repeatedly.
 *
 *   npx tsx scripts/test-charges.ts
 */
import { prismaUnsafe } from "@/lib/db/prisma";
import { generateInvoiceForTenant } from "@/lib/billing/invoices";
import { initiateCharge, settleCharge } from "@/lib/billing/charges";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
}

async function main() {
  const tenant = await prismaUnsafe.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) throw new Error("No tenant to test against");
  const tenantId = tenant.id;
  const original = {
    plan: tenant.subscriptionPlan,
    cycle: tenant.billingCycle,
    periodEnd: tenant.currentPeriodEnd,
    status: tenant.status
  };
  await prismaUnsafe.tenant.update({
    where: { id: tenantId },
    data: { subscriptionPlan: "PRO", billingCycle: "MONTHLY", currentPeriodEnd: null }
  });

  let invoiceId: string | undefined;
  try {
    const gen = await generateInvoiceForTenant(tenantId);
    invoiceId = gen.created ? gen.invoiceId : undefined;
    check("test invoice created", !!invoiceId);

    // 1. Initiation without configured gateway fails gracefully (no crash).
    const init = await initiateCharge({ invoiceId: invoiceId!, provider: "ZAAD", payerRef: "633000000" });
    check("uninitiated gateway fails gracefully", init.status === "FAILED", init.message);

    // 2. Simulate a gateway that returned PENDING (awaiting phone approval).
    const charge = await prismaUnsafe.gatewayCharge.create({
      data: {
        tenantId,
        invoiceId: invoiceId!,
        provider: "ZAAD",
        payerRef: "633000000",
        amount: 35,
        currency: "USD",
        status: "PENDING",
        initiatedBy: "test"
      }
    });
    // Suspend the tenant to prove settlement reactivates it.
    await prismaUnsafe.tenant.update({ where: { id: tenantId }, data: { status: "SUSPENDED" } });

    // 3. Webhook settles it successfully.
    const settled = await settleCharge({ chargeId: charge.id, providerRef: "TXN-TEST-1", success: true });
    check("settle returns ok", settled.ok === true);
    const inv = await prismaUnsafe.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
    check("invoice marked PAID", inv?.status === "PAID");
    const payment = await prismaUnsafe.subscriptionPayment.findFirst({ where: { invoiceId } });
    check("payment recorded with gateway ref", payment?.gatewayRef === "TXN-TEST-1" && payment?.method === "ZAAD");
    const t1 = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
    check("tenant reactivated by payment", t1?.status === "ACTIVE");
    const c1 = await prismaUnsafe.gatewayCharge.findUnique({ where: { id: charge.id } });
    check("charge marked SUCCESS", c1?.status === "SUCCESS");

    // 4. Idempotency: a duplicate webhook does not double-credit.
    const dup = await settleCharge({ chargeId: charge.id, providerRef: "TXN-TEST-1", success: true });
    const paymentCount = await prismaUnsafe.subscriptionPayment.count({ where: { invoiceId } });
    check("duplicate webhook is idempotent", dup.alreadySettled === true && paymentCount === 1);

    // 5. Failure path marks the charge FAILED.
    const failCharge = await prismaUnsafe.gatewayCharge.create({
      data: { tenantId, invoiceId: invoiceId!, provider: "EDAHAB", payerRef: "65x", amount: 35, currency: "USD", status: "PENDING" }
    });
    await settleCharge({ chargeId: failCharge.id, success: false, message: "declined" });
    const cFail = await prismaUnsafe.gatewayCharge.findUnique({ where: { id: failCharge.id } });
    check("failed webhook marks charge FAILED", cFail?.status === "FAILED");

    // 6. Unknown reference is a safe no-op.
    const missing = await settleCharge({ chargeId: "nonexistent-id", success: true });
    check("unknown charge settles to not-ok", missing.ok === false);
  } finally {
    if (invoiceId) {
      await prismaUnsafe.gatewayCharge.deleteMany({ where: { invoiceId } }).catch(() => {});
      await prismaUnsafe.subscriptionPayment.deleteMany({ where: { invoiceId } }).catch(() => {});
      await prismaUnsafe.subscriptionInvoice.deleteMany({ where: { id: invoiceId } }).catch(() => {});
    }
    await prismaUnsafe.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: original.plan,
        billingCycle: original.cycle,
        currentPeriodEnd: original.periodEnd,
        status: original.status
      }
    });
  }

  console.log(`\n${fail === 0 ? "✓ ALL PASSED" : "✗ FAILURES"}: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("✗ Test crashed:", error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaUnsafe.$disconnect();
  });
