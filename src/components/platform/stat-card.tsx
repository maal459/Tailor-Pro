import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "green" | "red" | "violet" | "amber";

const valueTone: Record<Tone, string> = {
  default: "text-[var(--text)]",
  green: "text-emerald-600",
  red: "text-red-600",
  violet: "text-[var(--violet)]",
  amber: "text-amber-600"
};

const iconTone: Record<Tone, string> = {
  default: "bg-[var(--bg)] text-[var(--muted)]",
  green: "bg-emerald-500/10 text-emerald-600",
  red: "bg-red-500/10 text-red-600",
  violet: "bg-[var(--violet)]/10 text-[var(--violet)]",
  amber: "bg-amber-500/10 text-amber-600"
};

/** Compact KPI card with an icon accent, used across the platform console. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default"
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconTone[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-3 text-2xl font-semibold", valueTone[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
