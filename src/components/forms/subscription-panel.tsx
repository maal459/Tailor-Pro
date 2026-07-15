"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import {
  generateInvoiceAction,
  updateTenantBillingAction
} from "@/app/platform/finance/actions";

type Values = {
  billingCycle: string;
  autoCollect: boolean;
  gatewayProvider: string;
  gatewayPayerRef: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

/** Per-tenant billing controls on the tenant edit page. */
export function SubscriptionPanel({
  tenantId,
  plan,
  initial
}: {
  tenantId: string;
  plan: string;
  initial: Values;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [generating, startGenerating] = useTransition();
  const [values, setValues] = useState<Values>(initial);

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startSaving(async () => {
      try {
        await updateTenantBillingAction(tenantId, values);
        toast.push("Billing settings saved");
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to save", "error");
      }
    });
  };

  const generate = () => {
    startGenerating(async () => {
      try {
        await generateInvoiceAction(tenantId);
        toast.push("Invoice generated");
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to generate invoice", "error");
      }
    });
  };

  return (
    <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
      <Field label="Billing cycle">
        <Select
          value={values.billingCycle}
          onChange={(e) => setValues((p) => ({ ...p, billingCycle: e.target.value }))}
        >
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly (2 months free)</option>
        </Select>
      </Field>

      <Field label="Payment gateway (for auto-collect)">
        <Select
          value={values.gatewayProvider}
          onChange={(e) => setValues((p) => ({ ...p, gatewayProvider: e.target.value }))}
        >
          <option value="">None (manual)</option>
          <option value="ZAAD">ZAAD</option>
          <option value="EDAHAB">eDahab</option>
        </Select>
      </Field>

      <Field label="Payer wallet / phone">
        <Input
          value={values.gatewayPayerRef}
          onChange={(e) => setValues((p) => ({ ...p, gatewayPayerRef: e.target.value }))}
          placeholder="e.g. 63xxxxxxx"
        />
      </Field>

      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input
          type="checkbox"
          checked={values.autoCollect}
          onChange={(e) => setValues((p) => ({ ...p, autoCollect: e.target.checked }))}
          className="h-4 w-4"
        />
        Auto-collect on renewal
      </label>

      <div className="md:col-span-2 flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save billing settings"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={generate}
          disabled={generating || plan === "FREE"}
          title={plan === "FREE" ? "Free-plan tenants are not billed" : undefined}
        >
          {generating ? "Generating…" : "Generate invoice now"}
        </Button>
      </div>
    </form>
  );
}
