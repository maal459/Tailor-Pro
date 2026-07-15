/**
 * Run the subscription dunning cycle: attempt automatic gateway collection, flag
 * past-due invoices as OVERDUE, and suspend tenants overdue beyond the grace period.
 *
 * Safe to run repeatedly. Intended for a daily cron on the production droplet:
 *   0 6 * * *  cd /var/www/tailor-pro && npx tsx scripts/run-billing-cycle.ts >> /var/log/tailor-billing.log 2>&1
 *
 * Manual run:
 *   npx tsx scripts/run-billing-cycle.ts
 */
import { prismaUnsafe } from "@/lib/db/prisma";
import { runBillingCycle } from "@/lib/billing/invoices";
import { GRACE_PERIOD_DAYS } from "@/lib/billing/plans";

runBillingCycle({ graceDays: GRACE_PERIOD_DAYS })
  .then((report) => {
    console.log(`[${new Date().toISOString()}] Billing cycle complete`);
    console.log(`  marked overdue:  ${report.markedOverdue}`);
    console.log(`  auto-collected:  ${report.autoCollected.length}`);
    console.log(`  collect failed:  ${report.autoCollectFailed.length}`);
    console.log(`  suspended:       ${report.suspended.length}`);
    for (const s of report.suspended) console.log(`    - suspended ${s.businessName} (${s.tenantId})`);
    for (const f of report.autoCollectFailed) console.log(`    - collect failed ${f.tenantId}: ${f.message}`);
  })
  .catch((error) => {
    console.error("✗ Billing cycle failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaUnsafe.$disconnect();
  });
