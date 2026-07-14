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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default async function SalaryReportPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports.view");
  const params = await searchParams;
  const period = parseReportPeriod(params.period);
  const { from, to } = getReportRange(period, params.from, params.to);

  const [salaries, activeEmployees] = await Promise.all([
    prisma.salary.findMany({
      where: { tenantId: session.tenantId, paymentDate: { gte: from, lte: to } },
      include: { employee: true },
      orderBy: { paymentDate: "desc" }
    }),
    prisma.employee.count({ where: { tenantId: session.tenantId, isActive: true } })
  ]);

  const totalAmount = salaries.reduce((sum, salary) => sum + toNumber(salary.amount), 0);

  const employeeTotals = new Map<string, number>();
  for (const salary of salaries) {
    const name = salary.employee.fullName;
    employeeTotals.set(name, (employeeTotals.get(name) ?? 0) + toNumber(salary.amount));
  }
  const byEmployee = [...employeeTotals.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Salary Report</h1>
          <p className="text-sm text-[var(--muted)]">Salary payments by period and employee</p>
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

      <ReportFilterBar basePath="/reports/salaries" period={period} from={from} to={to} />

      <p className="text-sm text-[var(--muted)]">
        {format(from, "dd MMM yyyy")} – {format(to, "dd MMM yyyy")} · {salaries.length} payment
        {salaries.length !== 1 ? "s" : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--muted)]">Total Salaries Paid</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Payments</p>
          <p className="mt-2 text-2xl font-semibold">{salaries.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Employees Paid</p>
          <p className="mt-2 text-2xl font-semibold">{byEmployee.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Active Employees</p>
          <p className="mt-2 text-2xl font-semibold">{activeEmployees}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">By Employee</h2>
        <div className="space-y-2">
          {byEmployee.map(([name, amount]) => (
            <div key={name} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <span className="text-sm">{name}</span>
              <strong className="text-sm">{formatCurrency(amount)}</strong>
            </div>
          ))}
          {!byEmployee.length && (
            <p className="text-sm text-[var(--muted)]">No salary payments in this period.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Payment Details</h2>
        <DataTable
          headers={["Paid On", "Employee", "Salary Period", "Amount", "Notes"]}
          emptyMessage="No salary payments in this period."
        >
          {salaries.length
            ? salaries.map((salary) => (
                <tr key={salary.id} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {salary.paymentDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{salary.employee.fullName}</td>
                  <td className="px-4 py-3">
                    {MONTH_NAMES[salary.month - 1] ?? salary.month} {salary.year}
                  </td>
                  <td className="px-4 py-3 font-semibold text-red-600">
                    {formatCurrency(toNumber(salary.amount))}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{salary.notes ?? "—"}</td>
                </tr>
              ))
            : null}
        </DataTable>
      </Card>
    </div>
  );
}
