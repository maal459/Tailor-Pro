import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanPriceForm } from "@/components/forms/plan-price-form";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { getEffectivePricing } from "@/lib/billing/pricing";
import { PLAN_DEFINITIONS, PLAN_ORDER } from "@/lib/billing/plans";
import { formatCurrency } from "@/lib/utils";

export default async function PlatformPlansPage() {
  await requireSuperAdmin();

  const [pricing, grouped] = await Promise.all([
    getEffectivePricing(),
    prismaUnsafe.tenant.groupBy({ by: ["subscriptionPlan"], _count: { _all: true } })
  ]);
  const counts = new Map(grouped.map((g) => [g.subscriptionPlan, g._count._all]));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#1A1D2E] to-[#2A2F45] p-6 text-white">
        <h1 className="text-2xl font-semibold">Plans &amp; Pricing</h1>
        <p className="text-sm text-white/70">
          Edit the prices tenants are billed. Limits and features below are enforced by the app.
          Yearly pricing gives 2 months free.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((plan) => {
          const def = PLAN_DEFINITIONS[plan];
          const price = pricing[plan];
          const count = counts.get(plan) ?? 0;
          const yearlySavings = price.monthlyPrice * 12 - price.yearlyPrice;

          return (
            <Card
              key={plan}
              className={def.highlighted ? "border-2 border-[var(--primary)]" : undefined}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{def.label}</h2>
                {def.highlighted && <Badge label="Popular" tone="success" />}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{def.tagline}</p>

              <div className="mt-3">
                <span className="text-3xl font-semibold">
                  {plan === "FREE" ? "Free" : formatCurrency(price.monthlyPrice, price.currency)}
                </span>
                {plan !== "FREE" && <span className="text-sm text-[var(--muted)]">/mo</span>}
              </div>
              {plan !== "FREE" && (
                <p className="text-xs text-[var(--muted)]">
                  or {formatCurrency(price.yearlyPrice, price.currency)}/yr
                  {yearlySavings > 0 ? ` · save ${formatCurrency(yearlySavings, price.currency)}` : ""}
                </p>
              )}

              <div className="mt-2">
                <Badge label={price.fromDb ? "Custom price" : "Default price"} tone={price.fromDb ? "success" : "neutral"} />
                <span className="ml-2 text-xs text-[var(--muted)]">{count} on this plan</span>
              </div>

              <ul className="mt-4 space-y-1.5">
                {def.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <PlanPriceForm
                  plan={plan}
                  currency={price.currency}
                  monthlyPrice={price.monthlyPrice}
                  yearlyPrice={price.yearlyPrice}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
