import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { salaryRepository } from "@/lib/repositories/salary-repository";
import { toNumber } from "@/lib/utils";
import { updateSalaryAction } from "@/app/(dashboard)/employees/actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default async function EditSalaryPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("employees.manage");
  const { id } = await params;

  const salary = await salaryRepository.byId(session.tenantId, id);
  if (!salary) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Salary Payment</h1>
        <p className="text-sm text-[var(--muted)]">
          {salary.employee.fullName} · {MONTH_NAMES[salary.month - 1]} {salary.year}
        </p>
      </div>

      <Card>
        <form className="space-y-4" action={updateSalaryAction.bind(null, salary.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Amount ($) *</label>
              <Input
                name="amount"
                type="number"
                min={0.01}
                step="0.01"
                defaultValue={toNumber(salary.amount)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Payment Date *</label>
              <Input
                name="paymentDate"
                type="date"
                defaultValue={salary.paymentDate.toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Salary Month *</label>
              <Select name="month" defaultValue={String(salary.month)}>
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Salary Year *</label>
              <Input name="year" type="number" min={2000} max={2100} defaultValue={salary.year} required />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--muted)]">Notes</label>
              <Input name="notes" defaultValue={salary.notes ?? ""} placeholder="Optional notes…" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Link
              href="/employees/salaries"
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
