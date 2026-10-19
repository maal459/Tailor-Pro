import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { PaymentForm } from "@/components/forms/payment-form";
import { deletePaymentAction } from "@/app/(dashboard)/payments/actions";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

export default async function PaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuth();
  const t       = await getT();
  const params  = await searchParams;
  const q       = params.q?.trim() ?? "";

  // Default to the 15 most recent; searching queries the whole tenant server-side (max 50),
  // so the page stays fast instead of loading every payment + every order into the browser.
  const [payments, methods] = await Promise.all([
    prisma.payment.findMany({
      where: {
        tenantId: session.tenantId,
        ...(q
          ? {
              OR: [
                { customer: { fullName: { contains: q } } },
                { customer: { phone: { contains: q } } },
                { order: { orderNumber: { contains: q } } },
                { referenceNo: { contains: q } }
              ]
            }
          : {})
      },
      include: { customer: true, order: true, paymentMethod: true },
      orderBy: { paymentDate: "desc" },
      take: q ? 50 : 15
    }),
    prisma.paymentMethod.findMany({ where: { tenantId: session.tenantId, isActive: true } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{t("Payments")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("Installment-friendly payment tracking")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/payments/history"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            {t("Customer History / Print")}
          </Link>
          <a
            href="/api/exports/payments.csv"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            {t("Export CSV")}
          </a>
        </div>
      </div>

      {/* Record new payment */}
      <Card>
        <p className="mb-4 text-sm font-semibold">{t("Record New Payment")}</p>
        <PaymentForm
          paymentMethods={methods.map((m) => ({ id: m.id, label: m.label }))}
        />
      </Card>

      {/* Search bar */}
      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={t("Search by phone, customer name, order number, or reference…")}
          className="h-10 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none"
        />
        <button className="rounded-xl bg-[var(--primary)] px-4 text-sm text-white">{t("Search")}</button>
        {q && (
          <a href="/payments" className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm">
            {t("Clear")}
          </a>
        )}
      </form>

      <p className="text-sm text-[var(--muted)]">
        {q
          ? `${t(payments.length !== 1 ? "{count} results for \"{q}\"" : "{count} result for \"{q}\"", { count: payments.length, q })}${payments.length === 50 ? t(" · showing first 50, refine to narrow") : ""}`
          : t("Showing the 15 most recent payments — search above to find any payment.")}
      </p>

      {/* Payments table */}
      <DataTable
        headers={["Date", "Customer", "Order", "Method", "Amount", "Reference", "Notes", "Actions"]}
        emptyMessage="No payments found."
      >
        {payments.map((payment) => (
          <tr key={payment.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
            <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
              {payment.paymentDate.toLocaleDateString()}
            </td>
            <td className="px-4 py-3 font-medium">{payment.customer.fullName}</td>
            <td className="px-4 py-3 font-mono text-xs">{payment.order.orderNumber}</td>
            <td className="px-4 py-3">{payment.paymentMethod.label}</td>
            <td className="px-4 py-3 font-semibold text-[var(--success)]">
              {formatCurrency(toNumber(payment.amount))}
            </td>
            <td className="px-4 py-3 text-[var(--muted)]">{payment.referenceNo ?? "—"}</td>
            <td className="px-4 py-3 text-[var(--muted)]">{payment.notes ?? "—"}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <Link
                  href={`/receipts?orderId=${payment.orderId}`}
                  className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                >
                  {t("Receipt")}
                </Link>
                <Link
                  href={`/payments/${payment.id}/edit`}
                  className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                >
                  {t("Edit")}
                </Link>
                <ActionButton
                  label={t("Delete")}
                  confirmText={t("Delete this {amount} payment? This affects the order balance.", { amount: formatCurrency(toNumber(payment.amount)) })}
                  action={deletePaymentAction.bind(null, payment.id)}
                  successMessage={t("Payment deleted")}
                  className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20"
                />
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
