import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { employeeRepository } from "@/lib/repositories/employee-repository";
import { toNumber } from "@/lib/utils";
import { updateEmployeeAction } from "@/app/(dashboard)/employees/actions";

export default async function EditEmployeePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("employees.manage");
  const { id } = await params;

  const employee = await employeeRepository.byId(session.tenantId, id);
  if (!employee) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Employee</h1>
        <p className="text-sm text-[var(--muted)]">{employee.fullName}</p>
      </div>

      <Card>
        <form className="space-y-4" action={updateEmployeeAction.bind(null, employee.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Full Name *</label>
              <Input name="fullName" defaultValue={employee.fullName} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Phone</label>
              <Input name="phone" defaultValue={employee.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Position</label>
              <Input name="position" defaultValue={employee.position ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Monthly Salary ($) *</label>
              <Input
                name="monthlySalary"
                type="number"
                min={0.01}
                step="0.01"
                defaultValue={toNumber(employee.monthlySalary)}
                required
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={employee.isActive} />
            Active employee
          </label>

          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Link
              href="/employees"
              className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
