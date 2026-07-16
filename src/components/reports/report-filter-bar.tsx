import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReportPeriod } from "@/lib/report-range";

const TABS: { id: ReportPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom" }
];

export function ReportFilterBar({
  basePath,
  period,
  from,
  to
}: {
  basePath: string;
  period: ReportPeriod;
  from: Date;
  to: Date;
}) {
  return (
    <>
      <div className="flex gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 print:hidden">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`${basePath}?period=${tab.id}`}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-center text-sm font-medium transition-all",
              period === tab.id
                ? "bg-[var(--primary)] text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {period === "custom" && (
        <Card className="print:hidden">
          <form className="flex flex-wrap items-center gap-3" method="get">
            <input type="hidden" name="period" value="custom" />
            <input
              type="date"
              name="from"
              defaultValue={from.toISOString().slice(0, 10)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus:outline-none"
            />
            <input
              type="date"
              name="to"
              defaultValue={to.toISOString().slice(0, 10)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus:outline-none"
            />
            <button className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm text-white">Apply</button>
          </form>
        </Card>
      )}
    </>
  );
}
