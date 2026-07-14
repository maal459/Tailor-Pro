import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { SalaryForm } from "@/components/forms/salary-form";
import { requirePermission } from "@/lib/auth/guards";
import { employeeRepository } from "@/lib/repositories/employee-repository";
import { salaryRepository } from "@/lib/repositories/salary-repository";
import { formatCurrency, toNumber } from "@/lib/utils";
import { deleteSalaryAction } from "@/app/(dashboard)/employees/actions";

const PAGE_SIZE = 10;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default async function SalariesPage({
  searchParams
}: {
  searchParams: Promise<{ employeeId?: string; month?: string; year?: string; page?: string }>;
}) {
  const session = await requirePermission("employees.manage");
  const params = await searchParams;
  const employeeId = params.employeeId?.trim();
  const month = Number(params.month ?? "") || undefined;
  const year = Number(params.year ?? "") || undefined;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const [{ rows, total }, employees, activeEmployees] = await Promise.all([
    salaryRepository.list(session.tenantId, { employeeId, month, year }, page, PAGE_SIZE),
    employeeRepository.list(session.tenantId, undefined, 1, 200),
    employeeRepository.listActive(session.tenantId)
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (employeeId) sp.set("employeeId", employeeId);
    if (month) sp.set("month", String(month));
    if (year) sp.set("year", String(year));
    sp.set("page", String(target));
    return `/employees/salaries?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Salary Payments</h1>
          <p className="text-sm text-[var(--muted)]">Record and review employee salary history</p>
        </div>
        <Link
          href="/employees"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
        >
          ← Employees
        </Link>
      </div>

      {/* Pay salary */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Record Salary Payment</p>
        <SalaryForm
          employees={activeEmployees.map((employee) => ({
            id: employee.id,
            label: `${employee.fullName}${employee.position ? ` — ${employee.position}` : ""}`,
            monthlySalary: toNumber(employee.monthlySalary)
          }))}
        />
      </Card>

      {/* Filters and history */}
      <Card>
        <form className="mb-4 grid gap-3 md:grid-cols-4" method="get">
          <Select name="employeeId" defaultValue={employeeId ?? ""}>
            <option value="">All employees</option>
            {employees.rows.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </Select>
          <Select name="month" defaultValue={month ? String(month) : ""}>
            <option value="">All months</option>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </Select>
          <Input name="year" type="number" min={2000} max={2100} placeholder="Year" defaultValue={year ?? ""} />
          <div className="flex gap-2">
            <Button variant="secondary" type="submit">
              Filter
            </Button>
            {(employeeId || month || year) && (
              <Link
                href="/employees/salaries"
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
              >
                Clear
              </Link>
            )}
          </div>
        </form>

        <DataTable
          headers={["Paid On", "Employee", "Salary Period", "Amount", "Notes", "Actions"]}
          emptyMessage="No salary payments found."
        >
          {rows.length
            ? rows.map((salary) => (
                <tr key={salary.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
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
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/employees/salaries/${salary.id}/edit`}
                        className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                      >
                        Edit
                      </Link>
                      <ActionButton
                        label="Delete"
                        confirmText={`Delete salary payment for "${salary.employee.fullName}" (${salary.month}/${salary.year})?`}
                        action={deleteSalaryAction.bind(null, salary.id)}
                        successMessage="Salary payment deleted"
                        className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20"
                      />
                    </div>
                  </td>
                </tr>
              ))
            : null}
        </DataTable>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p>
            Page {page} of {pageCount} · {total} payment{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <a className="rounded-lg border px-3 py-1" href={pageHref(Math.max(1, page - 1))}>
              Prev
            </a>
            <a className="rounded-lg border px-3 py-1" href={pageHref(Math.min(pageCount, page + 1))}>
              Next
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
