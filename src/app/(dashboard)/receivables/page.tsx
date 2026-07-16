import Link from "next/link";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth/guards";
import { getReceivables } from "@/lib/repositories/receivables-repository";
import { getReportRange, type ReportPeriod } from "@/lib/report-range";
import { formatCurrency, cn } from "@/lib/utils";

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "custom", label: "Custom" }
];

export default async function ReceivablesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; period?: string; from?: string; to?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const period: ReportPeriod = (["all", "month", "year", "custom"].includes(params.period ?? "")
    ? params.period
    : "all") as ReportPeriod;
  const { from, to } = getReportRange(period, params.from, params.to);

  const { rows, totalOutstanding, customerCount } = await getReceivables(session.tenantId, { from, to, q });

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    Object.entries(extra).forEach(([k, v]) => v && p.set(k, v));
    return p.toString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Receivables</h1>
        <p className="text-sm text-[var(--muted)]">Customers with an outstanding balance</p>
      </div>

      {/* Period tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={`/receivables?${qs({ period: p.id })}`}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all",
              period === p.id ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Search + custom date */}
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="period" value={period === "custom" ? "custom" : period} />
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-[var(--muted)]">Search customer</label>
            <Input name="q" defaultValue={q} placeholder="Name, phone, or customer number" />
          </div>
          {period === "custom" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--muted)]">From</label>
                <Input type="date" name="from" defaultValue={params.from ?? format(from, "yyyy-MM-dd")} className="w-40" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--muted)]">To</label>
                <Input type="date" name="to" defaultValue={params.to ?? format(to, "yyyy-MM-dd")} className="w-40" />
              </div>
            </>
          )}
          <Button type="submit">Apply</Button>
        </form>
      </Card>

      {/* List */}
      <Card>
        <DataTable
          headers={["Customer #", "Name", "Phone", "Last order", "Billed", "Paid", "Outstanding", ""]}
          emptyMessage="No customers with an outstanding balance for this period."
        >
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
              <td className="px-4 py-3 font-mono text-xs">{r.customerNumber}</td>
              <td className="px-4 py-3 font-medium">{r.fullName}</td>
              <td className="px-4 py-3">{r.phone}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                {r.lastOrder ? format(r.lastOrder, "dd MMM yyyy") : "—"}
              </td>
              <td className="px-4 py-3">{formatCurrency(r.billed)}</td>
              <td className="px-4 py-3 text-emerald-600">{formatCurrency(r.paid)}</td>
              <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(r.balance)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/customers/${r.id}`}
                  className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>

        {/* Total at the bottom */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[var(--primary)] px-4 py-3">
          <span className="text-sm font-medium">
            Total outstanding
            <span className="text-[var(--muted)]">
              {" "}· {customerCount} customer{customerCount !== 1 ? "s" : ""}
              {rows.length < customerCount ? ` (showing top ${rows.length})` : ""}
            </span>
          </span>
          <span className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</span>
        </div>
      </Card>
    </div>
  );
}
