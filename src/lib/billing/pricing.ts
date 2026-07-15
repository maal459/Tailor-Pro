import type { BillingCycle, SubscriptionPlan } from "@prisma/client";
import { prismaUnsafe } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { CURRENCY, PLAN_DEFINITIONS, PLAN_ORDER } from "@/lib/billing/plans";

export type PlanPricing = {
  plan: SubscriptionPlan;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  isActive: boolean;
  /** true when the figure comes from an editable PlanPrice row, false when it is the code default. */
  fromDb: boolean;
};

/**
 * Effective price book: an editable PlanPrice row wins over the code default, and
 * plans with no row fall back to src/lib/billing/plans.ts. This keeps the app working
 * before the price book is seeded and lets a super-admin change prices without a deploy.
 */
export async function getEffectivePricing(): Promise<Record<SubscriptionPlan, PlanPricing>> {
  const rows = await prismaUnsafe.planPrice.findMany();
  const byPlan = new Map(rows.map((row) => [row.plan, row]));

  const result = {} as Record<SubscriptionPlan, PlanPricing>;
  for (const plan of PLAN_ORDER) {
    const def = PLAN_DEFINITIONS[plan];
    const row = byPlan.get(plan);
    result[plan] = row
      ? {
          plan,
          monthlyPrice: toNumber(row.monthlyPrice),
          yearlyPrice: toNumber(row.yearlyPrice),
          currency: row.currency,
          isActive: row.isActive,
          fromDb: true
        }
      : {
          plan,
          monthlyPrice: def.monthlyPrice,
          yearlyPrice: def.yearlyPrice,
          currency: def.currency,
          isActive: true,
          fromDb: false
        };
  }
  return result;
}

export async function getPlanPricing(plan: SubscriptionPlan): Promise<PlanPricing> {
  const all = await getEffectivePricing();
  return all[plan];
}

/** Price charged for one period of a given plan + cycle, using the effective price book. */
export function priceForCycle(pricing: PlanPricing, cycle: BillingCycle): number {
  return cycle === "YEARLY" ? pricing.yearlyPrice : pricing.monthlyPrice;
}

/**
 * Idempotently writes the code-default prices into the PlanPrice table so they become
 * editable in the UI. Existing rows are left untouched (never overwrites a manual price).
 */
export async function ensurePlanPricesSeeded() {
  for (const plan of PLAN_ORDER) {
    const def = PLAN_DEFINITIONS[plan];
    const existing = await prismaUnsafe.planPrice.findUnique({ where: { plan } });
    if (existing) continue;
    await prismaUnsafe.planPrice.create({
      data: {
        plan,
        monthlyPrice: def.monthlyPrice,
        yearlyPrice: def.yearlyPrice,
        currency: def.currency,
        isActive: true
      }
    });
  }
}

export { CURRENCY };
