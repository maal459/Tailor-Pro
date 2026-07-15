"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { updatePlanPriceAction } from "@/app/platform/plans/actions";

/** Inline editor for one plan's monthly / yearly price. Persists to the PlanPrice table. */
export function PlanPriceForm({
  plan,
  currency,
  monthlyPrice,
  yearlyPrice
}: {
  plan: string;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({
    monthlyPrice: String(monthlyPrice),
    yearlyPrice: String(yearlyPrice)
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        await updatePlanPriceAction({
          plan,
          monthlyPrice: Number(values.monthlyPrice),
          yearlyPrice: Number(values.yearlyPrice),
          isActive: true
        });
        toast.push(`${plan} pricing saved`);
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to save price", "error");
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted)]">Monthly ({currency})</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="w-28"
          value={values.monthlyPrice}
          onChange={(e) => setValues((p) => ({ ...p, monthlyPrice: e.target.value }))}
          disabled={plan === "FREE"}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--muted)]">Yearly ({currency})</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="w-28"
          value={values.yearlyPrice}
          onChange={(e) => setValues((p) => ({ ...p, yearlyPrice: e.target.value }))}
          disabled={plan === "FREE"}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending || plan === "FREE"}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
