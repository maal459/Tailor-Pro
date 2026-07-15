/**
 * Smoke test for the subscription billing engine. Exercises the full flow against the
 * dev DB using the first available tenant, then cleans up every row it creates and
 * restores the tenant's paid-through date. Safe to run repeatedly.
 *
 *   npx tsx scripts/test-billing.ts
 */
import { prismaUnsafe } from "@/lib/db/prisma";
import { ensurePlanPricesSeeded, getEffectivePricing } from "@/lib/billing/pricing";
import {
  generateInvoiceForTenant,
  getBillingSummary,
  markInvoicePaid,
  runBillingCycle
} from "@/lib/billing/invoices";
import { assertWithinPlanLimit } from "@/lib/billing/limits";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, extra = "") {
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (ok) pass++;
  else fail++;
}

async function main() {
  // Use a paid-plan tenant so invoices actually generate. Force one onto PRO for the test.
  const tenant = await prismaUnsafe.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) throw new Error("No tenant in DB to test against");
  const tenantId = tenant.id;
  console.log(`Testing against tenant: ${tenant.businessName} (${tenantId})`);

  const originalPlan = tenant.subscriptionPlan;
  const originalCycle = tenant.billingCycle;
  const originalPeriodEnd = tenant.currentPeriodEnd;
  const originalStatus = tenant.status;
  await prismaUnsafe.tenant.update({
    where: { id: tenantId },
    data: { subscriptionPlan: "PRO", billingCycle: "MONTHLY", currentPeriodEnd: null }
  });

  let invoiceId: string | undefined;
  let paymentId: string | undefined;

  try {
    // 1. Price book
    await ensurePlanPricesSeeded();
    const pricing = await getEffectivePricing();
    check("plan prices seeded", pricing.BASIC.monthlyPrice === 15, `BASIC=$${pricing.BASIC.monthlyPrice}`);
    check("PRO priced correctly", pricing.PRO.monthlyPrice === 35, `PRO=$${pricing.PRO.monthlyPrice}`);
    check("ENTERPRISE priced correctly", pricing.ENTERPRISE.monthlyPrice === 75, `ENT=$${pricing.ENTERPRISE.monthlyPrice}`);
    check("annual = 2 months free", pricing.PRO.yearlyPrice === 350, `PRO/yr=$${pricing.PRO.yearlyPrice}`);

    // 2. Plan-limit enforcement (PRO allows 10 users — should not throw for the demo tenant)
    let limitOk = true;
    try {
      await assertWithinPlanLimit(tenantId, "users");
    } catch {
      limitOk = false;
    }
    check("plan limit allows within cap", limitOk);

    // 3. Generate invoice
    const gen = await generateInvoiceForTenant(tenantId);
    check("invoice generated", gen.created === true);
    invoiceId = gen.created ? gen.invoiceId : undefined;

    // 3b. Second generate is a no-op (one open invoice at a time)
    const gen2 = await generateInvoiceForTenant(tenantId);
    check("no double-billing", gen2.created === false && gen2.reason === "open-invoice");

    const invoice = await prismaUnsafe.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
    check("invoice amount = $35 (PRO monthly)", Number(invoice?.amount) === 35, `amount=$${invoice?.amount}`);
    check("invoice status PENDING", invoice?.status === "PENDING");

    // 4. Summary reflects the paid tenant / outstanding invoice
    const summary = await getBillingSummary();
    check("MRR includes tenant", summary.mrr >= 35, `MRR=$${summary.mrr.toFixed(2)}`);
    check("outstanding includes invoice", summary.outstanding >= 35, `outstanding=$${summary.outstanding}`);

    // 5. Mark paid
    await markInvoicePaid(invoiceId!, { method: "ZAAD", gatewayRef: "TEST-TXN-1", recordedBy: "test" });
    const paid = await prismaUnsafe.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
    check("invoice now PAID", paid?.status === "PAID");
    const payment = await prismaUnsafe.subscriptionPayment.findFirst({ where: { invoiceId } });
    paymentId = payment?.id;
    check("payment recorded", !!payment && Number(payment.amount) === 35);
    const tAfter = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
    check("paid-through advanced", tAfter?.currentPeriodEnd != null);

    // 6. Billing cycle is a safe no-op now (invoice already paid)
    const report = await runBillingCycle();
    check("billing cycle runs", typeof report.markedOverdue === "number", `overdue=${report.markedOverdue}, suspended=${report.suspended.length}`);

    // 7. Overdue + auto-suspend path: back-date a fresh unpaid invoice past the grace window
    const stale = await prismaUnsafe.subscriptionInvoice.create({
      data: {
        tenantId,
        plan: "PRO",
        billingCycle: "MONTHLY",
        amount: 35,
        currency: "USD",
        periodStart: new Date("2020-01-01"),
        periodEnd: new Date("2020-02-01"),
        dueDate: new Date("2020-01-01"),
        status: "PENDING"
      }
    });
    const report2 = await runBillingCycle();
    const suspended = report2.suspended.some((s) => s.tenantId === tenantId);
    const tSusp = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
    check("stale invoice suspends tenant", suspended && tSusp?.status === "SUSPENDED");

    // 8. Paying the stale invoice reactivates the tenant
    await markInvoicePaid(stale.id, { method: "CASH", recordedBy: "test" });
    const tReact = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
    check("payment reactivates suspended tenant", tReact?.status === "ACTIVE");

    // cleanup extra rows
    await prismaUnsafe.subscriptionPayment.deleteMany({ where: { invoiceId: stale.id } });
    await prismaUnsafe.subscriptionInvoice.delete({ where: { id: stale.id } });
  } finally {
    // Clean up everything this test created and restore the tenant.
    if (paymentId) await prismaUnsafe.subscriptionPayment.deleteMany({ where: { invoiceId } }).catch(() => {});
    if (invoiceId) await prismaUnsafe.subscriptionInvoice.deleteMany({ where: { id: invoiceId } }).catch(() => {});
    await prismaUnsafe.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: originalPlan,
        billingCycle: originalCycle,
        currentPeriodEnd: originalPeriodEnd,
        status: originalStatus
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
