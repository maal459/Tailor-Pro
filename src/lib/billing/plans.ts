import type { SubscriptionPlan } from "@prisma/client";

/**
 * Canonical definition of the platform's subscription plans: prices, hard limits,
 * and the marketing feature list. This is the source of truth the app falls back to
 * when the editable `PlanPrice` table has no row for a plan, so pricing works even
 * before the price book is seeded. Limits here are ENFORCED (see billing/limits.ts).
 *
 * Annual pricing follows a "2 months free" rule: yearlyPrice = monthlyPrice × 10.
 */

export type PlanLimits = {
  /** null = unlimited */
  maxUsers: number | null;
  maxCustomers: number | null;
  maxProducts: number | null;
};

export type PlanDefinition = {
  plan: SubscriptionPlan;
  label: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  limits: PlanLimits;
  features: string[];
  /** Marked as the recommended tier on the pricing page. */
  highlighted?: boolean;
};

export const CURRENCY = "USD";

/** How many days after the due date before an unpaid tenant is auto-suspended. */
export const GRACE_PERIOD_DAYS = 14;

export const PLAN_DEFINITIONS: Record<SubscriptionPlan, PlanDefinition> = {
  FREE: {
    plan: "FREE",
    label: "Free Trial",
    tagline: "Evaluate Tailor Pro with real data",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: CURRENCY,
    limits: { maxUsers: 1, maxCustomers: 25, maxProducts: 25 },
    features: [
      "1 user account",
      "Up to 25 customers",
      "Orders, measurements & payments",
      "14-day evaluation window"
    ]
  },
  BASIC: {
    plan: "BASIC",
    label: "Basic",
    tagline: "For a single tailoring shop",
    monthlyPrice: 15,
    yearlyPrice: 150,
    currency: CURRENCY,
    limits: { maxUsers: 3, maxCustomers: 500, maxProducts: 300 },
    features: [
      "Up to 3 staff users",
      "Up to 500 customers",
      "Orders, measurements & payments",
      "Expenses, salaries & inventory",
      "Standard reports",
      "Email support"
    ]
  },
  PRO: {
    plan: "PRO",
    label: "Pro",
    tagline: "For a growing tailoring business",
    monthlyPrice: 35,
    yearlyPrice: 350,
    currency: CURRENCY,
    highlighted: true,
    limits: { maxUsers: 10, maxCustomers: 5000, maxProducts: 5000 },
    features: [
      "Up to 10 staff users",
      "Up to 5,000 customers",
      "Everything in Basic",
      "Full profit / loss & analytics",
      "Custom branding (logo & colour)",
      "Priority support"
    ]
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    label: "Enterprise",
    tagline: "For multi-branch operations",
    monthlyPrice: 75,
    yearlyPrice: 750,
    currency: CURRENCY,
    limits: { maxUsers: null, maxCustomers: null, maxProducts: null },
    features: [
      "Unlimited staff users",
      "Unlimited customers",
      "Everything in Pro",
      "Automated mobile-money billing (ZAAD / eDahab)",
      "Dedicated onboarding",
      "Phone & WhatsApp support"
    ]
  }
};

/** Display / upgrade order, cheapest to most expensive. */
export const PLAN_ORDER: SubscriptionPlan[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"];

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition {
  return PLAN_DEFINITIONS[plan];
}

/** Resource keys we currently enforce a cap on. */
export type LimitedResource = "users" | "customers" | "products";

const RESOURCE_TO_LIMIT: Record<LimitedResource, keyof PlanLimits> = {
  users: "maxUsers",
  customers: "maxCustomers",
  products: "maxProducts"
};

export function getPlanLimit(plan: SubscriptionPlan, resource: LimitedResource): number | null {
  return PLAN_DEFINITIONS[plan].limits[RESOURCE_TO_LIMIT[resource]];
}

/** Monthly-equivalent price for MRR maths (annual plans amortised over 12 months). */
export function monthlyEquivalent(monthlyPrice: number, yearlyPrice: number, cycle: "MONTHLY" | "YEARLY") {
  return cycle === "YEARLY" ? yearlyPrice / 12 : monthlyPrice;
}
