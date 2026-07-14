import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { requirePermission } from "@/lib/auth/guards";
import { employeeRepository } from "@/lib/repositories/employee-repository";
import { formatCurrency, toNumber } from "@/lib/utils";
import { createEmployeeAction, deleteEmployeeAction } from "@/app/(dashboard)/employees/actions";

const PAGE_SIZE = 10;

export default async function EmployeesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePermission("employees.manage");
  const params = await searchParams;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const { rows, total } = await employeeRepository.list(session.tenantId, q, page, PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-[var(--muted)]">Manage staff and monthly salaries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/employees/salaries"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Salary Payments
          </Link>
          <Link
            href="/reports/salaries"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Salary Report
          </Link>
        </div>
      </div>

      {/* Add employee */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Add Employee</p>
        <form className="grid gap-3 md:grid-cols-4" action={createEmployeeAction}>
          <Input name="fullName" placeholder="Full name *" required />
          <Input name="phone" placeholder="Phone" />
          <Input name="position" placeholder="Position (e.g. Tailor)" />
          <Input
            name="monthlySalary"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="Monthly salary *"
            required
          />
          <Button type="submit" className="md:w-fit">
            Add Employee
          </Button>
        </form>
      </Card>

      {/* Search and list */}
      <Card>
        <form className="mb-4 flex gap-2" method="get">
          <Input name="q" placeholder="Search name, phone, or position" defaultValue={q} />
          <Button variant="secondary" type="submit">
            Search
          </Button>
        </form>

        <DataTable
          headers={["Name", "Phone", "Position", "Monthly Salary", "Payments", "Status", "Actions"]}
          emptyMessage="No employees found."
        >
          {rows.length
            ? rows.map((employee) => (
                <tr key={employee.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
                  <td className="px-4 py-3 font-medium">{employee.fullName}</td>
                  <td className="px-4 py-3">{employee.phone ?? "—"}</td>
                  <td className="px-4 py-3">{employee.position ?? "—"}</td>
                  <td className="px-4 py-3">{formatCurrency(toNumber(employee.monthlySalary))}</td>
                  <td className="px-4 py-3">{employee._count.salaries}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={employee.isActive ? "Active" : "Inactive"}
                      tone={employee.isActive ? "success" : "danger"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/employees/salaries?employeeId=${employee.id}`}
                        className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      >
                        Salaries
                      </Link>
                      <Link
                        href={`/employees/${employee.id}/edit`}
                        className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                      >
                        Edit
                      </Link>
                      <ActionButton
                        label="Delete"
                        confirmText={`Delete employee "${employee.fullName}"?`}
                        action={deleteEmployeeAction.bind(null, employee.id)}
                        successMessage="Employee deleted"
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
            Page {page} of {pageCount} · {total} employee{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <a
              className="rounded-lg border px-3 py-1"
              href={`/employees?page=${Math.max(1, page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              Prev
            </a>
            <a
              className="rounded-lg border px-3 py-1"
              href={`/employees?page=${Math.min(pageCount, page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              Next
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
