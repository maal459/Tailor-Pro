import { format } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PrintButton } from "@/components/ui/print-button";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getReportRange, parseReportPeriod } from "@/lib/report-range";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function ExpenseReportPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports.view");
  const params = await searchParams;
  const period = parseReportPeriod(params.period);
  const { from, to } = getReportRange(period, params.from, params.to);

  // Totals and the category breakdown aggregate in the DB over the full period;
  // the details table only shows the latest 20 rows.
  const where = { tenantId: session.tenantId, expenseDate: { gte: from, lte: to } };
  const [expenses, categories, totals, grouped] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true, paymentMethod: true },
      orderBy: { expenseDate: "desc" },
      take: 20
    }),
    prisma.expenseCategory.findMany({ where: { tenantId: session.tenantId } }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.expense.groupBy({ by: ["categoryId"], where, _sum: { amount: true } })
  ]);

  const totalAmount = toNumber(totals._sum.amount ?? 0);
  const entryCount = totals._count._all;

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const byCategory = grouped
    .map((g) => [g.categoryId ? categoryName.get(g.categoryId) ?? "Uncategorized" : "Uncategorized", toNumber(g._sum.amount ?? 0)] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expense Report</h1>
          <p className="text-sm text-[var(--muted)]">Spending overview by period and category</p>
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

      <ReportFilterBar basePath="/reports/expenses" period={period} from={from} to={to} />

      <p className="text-sm text-[var(--muted)]">
        {format(from, "dd MMM yyyy")} – {format(to, "dd MMM yyyy")} · {entryCount} expense
        {entryCount !== 1 ? "s" : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--muted)]">Total Expenses</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Entries</p>
          <p className="mt-2 text-2xl font-semibold">{entryCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Categories Used</p>
          <p className="mt-2 text-2xl font-semibold">{byCategory.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Avg per Entry</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(entryCount ? totalAmount / entryCount : 0)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">By Category</h2>
          <div className="space-y-2">
            {byCategory.map(([name, amount]) => (
              <div key={name} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="text-sm">{name}</span>
                <strong className="text-sm">{formatCurrency(amount)}</strong>
              </div>
            ))}
            {!byCategory.length && (
              <p className="text-sm text-[var(--muted)]">No expenses in this period.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">All Categories</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"} defined
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs"
              >
                {category.name}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Expense Details</h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Showing the 20 most recent — totals above cover the whole period.
        </p>
        <DataTable
          headers={["Date", "Title", "Category", "Method", "Amount"]}
          emptyMessage="No expenses in this period."
        >
          {expenses.length
            ? expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {expense.expenseDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{expense.title}</td>
                  <td className="px-4 py-3">{expense.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">{expense.paymentMethod?.label ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">
                    {formatCurrency(toNumber(expense.amount))}
                  </td>
                </tr>
              ))
            : null}
        </DataTable>
      </Card>
    </div>
  );
}
