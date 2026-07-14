import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { requirePermission } from "@/lib/auth/guards";
import { expenseRepository } from "@/lib/repositories/expense-repository";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";
import {
  createExpenseAction,
  createExpenseCategoryAction,
  deleteExpenseAction,
  deleteExpenseCategoryAction
} from "@/app/(dashboard)/expenses/actions";

const PAGE_SIZE = 10;

export default async function ExpensesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await requirePermission("expenses.manage");
  const params = await searchParams;
  const q = params.q?.trim();
  const categoryId = params.categoryId?.trim();
  const from = params.from?.trim();
  const to = params.to?.trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const [{ rows, total }, categories, methods] = await Promise.all([
    expenseRepository.list(
      session.tenantId,
      {
        query: q,
        categoryId,
        from: from ? new Date(`${from}T00:00:00`) : undefined,
        to: to ? new Date(`${to}T23:59:59.999`) : undefined
      },
      page,
      PAGE_SIZE
    ),
    expenseRepository.listCategories(session.tenantId),
    prisma.paymentMethod.findMany({ where: { tenantId: session.tenantId, isActive: true } })
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("categoryId", categoryId);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    sp.set("page", String(target));
    return `/expenses?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-[var(--muted)]">Track shop expenses and spending categories</p>
        </div>
        <Link
          href="/reports/expenses"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
        >
          Expense Report
        </Link>
      </div>

      {/* Record new expense */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Record New Expense</p>
        <form className="grid gap-3 md:grid-cols-3" action={createExpenseAction}>
          <Input name="title" placeholder="Expense title *" required />
          <Input name="amount" type="number" min={0.01} step="0.01" placeholder="Amount *" required />
          <Input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <Select name="categoryId" defaultValue="">
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select name="paymentMethodId" defaultValue="">
            <option value="">No payment method</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </Select>
          <Input name="notes" placeholder="Notes" />
          <Button type="submit" className="md:col-span-3 md:w-fit">
            Add Expense
          </Button>
        </form>
      </Card>

      {/* Expense categories */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Expense Categories</p>
        <form className="mb-4 grid gap-3 md:grid-cols-3" action={createExpenseCategoryAction}>
          <Input name="name" placeholder="Category name *" required />
          <Input name="description" placeholder="Description" />
          <Button variant="secondary" type="submit" className="md:w-fit">
            Add Category
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs"
            >
              {category.name}
              <ActionButton
                label="×"
                confirmText={`Delete category "${category.name}"? Expenses keep their records without a category.`}
                action={deleteExpenseCategoryAction.bind(null, category.id)}
                successMessage="Category deleted"
                className="text-red-500 hover:text-red-700"
              />
            </span>
          ))}
          {!categories.length && (
            <p className="text-sm text-[var(--muted)]">No categories yet. Add one above.</p>
          )}
        </div>
      </Card>

      {/* Search, filters, and list */}
      <Card>
        <form className="mb-4 grid gap-3 md:grid-cols-5" method="get">
          <Input name="q" placeholder="Search title or notes" defaultValue={q} />
          <Select name="categoryId" defaultValue={categoryId ?? ""}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Input name="from" type="date" defaultValue={from} />
          <Input name="to" type="date" defaultValue={to} />
          <div className="flex gap-2">
            <Button variant="secondary" type="submit">
              Filter
            </Button>
            {(q || categoryId || from || to) && (
              <Link
                href="/expenses"
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
              >
                Clear
              </Link>
            )}
          </div>
        </form>

        <DataTable
          headers={["Date", "Title", "Category", "Method", "Recorded By", "Amount", "Actions"]}
          emptyMessage="No expenses found."
        >
          {rows.length
            ? rows.map((expense) => (
                <tr key={expense.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {expense.expenseDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{expense.title}</td>
                  <td className="px-4 py-3">{expense.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">{expense.paymentMethod?.label ?? "—"}</td>
                  <td className="px-4 py-3">{expense.createdBy?.fullName ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">
                    {formatCurrency(toNumber(expense.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/expenses/${expense.id}/edit`}
                        className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                      >
                        Edit
                      </Link>
                      <ActionButton
                        label="Delete"
                        confirmText={`Delete expense "${expense.title}"?`}
                        action={deleteExpenseAction.bind(null, expense.id)}
                        successMessage="Expense deleted"
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
            Page {page} of {pageCount} · {total} expense{total !== 1 ? "s" : ""}
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
