import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { expenseRepository } from "@/lib/repositories/expense-repository";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { updateExpenseAction } from "@/app/(dashboard)/expenses/actions";

export default async function EditExpensePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("expenses.manage");
  const t = await getT();
  const { id } = await params;

  const [expense, categories, methods] = await Promise.all([
    expenseRepository.byId(session.tenantId, id),
    expenseRepository.listCategories(session.tenantId),
    prisma.paymentMethod.findMany({ where: { tenantId: session.tenantId, isActive: true } })
  ]);

  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Edit Expense")}</h1>
        <p className="text-sm text-[var(--muted)]">
          {expense.title} · {expense.expenseDate.toLocaleDateString()}
        </p>
      </div>

      <Card>
        <form className="space-y-4" action={updateExpenseAction.bind(null, expense.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Title *")}</label>
              <Input name="title" defaultValue={expense.title} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Amount ($) *")}</label>
              <Input
                name="amount"
                type="number"
                min={0.01}
                step="0.01"
                defaultValue={toNumber(expense.amount)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Date")}</label>
              <Input
                name="expenseDate"
                type="date"
                defaultValue={expense.expenseDate.toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Category")}</label>
              <Select name="categoryId" defaultValue={expense.categoryId ?? ""}>
                <option value="">{t("No category")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Payment Method")}</label>
              <Select name="paymentMethodId" defaultValue={expense.paymentMethodId ?? ""}>
                <option value="">{t("No payment method")}</option>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Notes")}</label>
              <Input name="notes" defaultValue={expense.notes ?? ""} placeholder={t("Optional notes…")} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">{t("Save Changes")}</Button>
            <Link
              href="/expenses"
              className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
            >
              {t("Cancel")}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
