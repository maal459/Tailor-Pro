"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PLANS = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

/** Filters the businesses table by plan and by the date the business joined (createdAt). */
export function FinanceFilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [plan, setPlan] = useState(sp.get("plan") ?? "");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");

  const apply = () => {
    const params = new URLSearchParams();
    if (plan) params.set("plan", plan);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.push(qs ? `/platform/finance?${qs}` : "/platform/finance");
  };

  const clear = () => {
    setPlan("");
    setFrom("");
    setTo("");
    router.push("/platform/finance");
  };

  const active = plan || from || to;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <Field label="Plan">
        <Select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-40">
          <option value="">All plans</option>
          {PLANS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </Field>
      <Field label="Joined from">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
      </Field>
      <Field label="Joined to">
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </Field>
      <Button type="button" onClick={apply}>Apply</Button>
      {active && (
        <Button type="button" variant="secondary" onClick={clear}>Clear</Button>
      )}
    </div>
  );
}
