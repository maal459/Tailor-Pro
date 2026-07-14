import { format } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PrintButton } from "@/components/ui/print-button";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { requirePermission } from "@/lib/auth/guards";
import { financeService } from "@/lib/services/finance-service";
import { getReportRange, parseReportPeriod } from "@/lib/report-range";
import { formatCurrency, cn } from "@/lib/utils";

export default async function ProfitLossReportPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports.view");
  const params = await searchParams;
  const period = parseReportPeriod(params.period);
  const { from, to } = getReportRange(period, params.from, params.to);

  const summary = await financeService.profitLossSummary(session.tenantId, { from, to });

  const rows = [
    { label: "Income (Payments Received)", value: summary.totalIncome, sign: "+" },
    { label: "Expenses", value: summary.totalExpenses, sign: "−" },
    { label: "Salaries", value: summary.totalSalaries, sign: "−" },
    { label: "Purchases", value: summary.totalPurchases, sign: "−" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Profit / Loss Report</h1>
          <p className="text-sm text-[var(--muted)]">
            Income vs. expenses, salaries, and purchases
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href="/reports"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            ← Reports
          </Link>
          <PrintButton label="PDF" />
        </div>
      </div>

      <ReportFilterBar basePath="/reports/profit-loss" period={period} from={from} to={to} />

      <p className="text-sm text-[var(--muted)]">
        {format(from, "dd MMM yyyy")} – {format(to, "dd MMM yyyy")}
      </p>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--muted)]">Income</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatCurrency(summary.totalIncome)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Salaries</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {formatCurrency(summary.totalSalaries)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Purchases</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {formatCurrency(summary.totalPurchases)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Available Cash</p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold",
              summary.availableCash >= 0 ? "text-emerald-600" : "text-red-600"
            )}
          >
            {formatCurrency(summary.availableCash)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Income − Expenses − Salaries</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Net Profit</p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold",
              summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
            )}
          >
            {formatCurrency(summary.netProfit)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Income − Expenses − Salaries − Purchases
          </p>
        </Card>
      </div>

      {/* Statement breakdown */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Statement</h2>
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-xl border px-3 py-2"
            >
              <span className="text-sm">
                <span className="mr-2 font-mono">{row.sign}</span>
                {row.label}
              </span>
              <strong
                className={cn("text-sm", row.sign === "+" ? "text-emerald-600" : "text-red-600")}
              >
                {formatCurrency(row.value)}
              </strong>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-xl border-2 border-[var(--primary)] px-3 py-2">
            <span className="text-sm font-semibold">Net Profit</span>
            <strong
              className={cn(
                "text-sm",
                summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              {formatCurrency(summary.netProfit)}
            </strong>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Link
          href="/reports/expenses"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
        >
          Expense Report →
        </Link>
        <Link
          href="/reports/salaries"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
        >
          Salary Report →
        </Link>
        <Link
          href="/reports/purchases"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
        >
          Purchase Report →
        </Link>
      </div>
    </div>
  );
}
