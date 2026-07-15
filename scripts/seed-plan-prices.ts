/**
 * Seed the editable PlanPrice table from the code defaults in src/lib/billing/plans.ts.
 * Idempotent — existing rows are left untouched, so it never overwrites a price you
 * changed in the UI. The app already falls back to the code defaults when a row is
 * missing; this just makes every plan editable from the Plans & Pricing page.
 *
 * Usage:
 *   npx tsx scripts/seed-plan-prices.ts
 */
import { prismaUnsafe } from "@/lib/db/prisma";
import { ensurePlanPricesSeeded } from "@/lib/billing/pricing";

ensurePlanPricesSeeded()
  .then(async () => {
    const rows = await prismaUnsafe.planPrice.findMany({ orderBy: { monthlyPrice: "asc" } });
    console.log("✓ Plan prices seeded / present:");
    for (const row of rows) {
      console.log(`  ${row.plan.padEnd(11)} ${row.currency} ${row.monthlyPrice}/mo  ${row.yearlyPrice}/yr`);
    }
  })
  .catch((error) => {
    console.error("✗", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaUnsafe.$disconnect();
  });
