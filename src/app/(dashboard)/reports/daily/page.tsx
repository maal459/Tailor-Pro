import { startOfDay, endOfDay, format } from "date-fns";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PrintButton } from "@/components/ui/print-button";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function DailyTransactionsPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session      = await requireAuth();
  const params       = await searchParams;
  const selectedDate = params.date ? new Date(params.date) : new Date();
  const dayStart     = startOfDay(selectedDate);
  const dayEnd       = endOfDay(selectedDate);
  const dateLabel    = format(selectedDate, "EEEE, dd MMMM yyyy");

  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where:   { tenantId: session.tenantId, orderDate: { gte: dayStart, lte: dayEnd } },
      include: { items: true, customer: true, payments: true }
    }),
    prisma.payment.findMany({
      where:   { tenantId: session.tenantId, paymentDate: { gte: dayStart, lte: dayEnd } },
      include: { customer: true, order: true, paymentMethod: true },
      orderBy: { paymentDate: "asc" }
    })
  ]);

  const paymentsReceived = payments.reduce((s, p) => s + toNumber(p.amount), 0);
  const ordersValue      = orders.reduce((s, o) => {
    return s + o.items.reduce((a, i) => a + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount);
  }, 0);
  const discountsGiven   = orders.reduce((s, o) => s + toNumber(o.discountAmount), 0);
  const outstandingNew   = ordersValue - orders.reduce((s, o) => {
    // only payments recorded on this day for each order
    return s + o.payments.reduce((a, p) => a + toNumber(p.amount), 0);
  }, 0);

  // group payments by method
  const methodTotals = new Map<string, number>();
  for (const p of payments) {
    const label = p.paymentMethod.label;
    methodTotals.set(label, (methodTotals.get(label) ?? 0) + toNumber(p.amount));
  }

  return (
    <div className="space-y-6">
      {/* Controls — hidden on print */}
      <div className="no-print print:hidden flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Daily Sales Report</h1>
          <p className="text-sm text-[var(--muted)]">{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <form className="flex gap-2" method="get">
            <input
              type="date"
              name="date"
              defaultValue={selectedDate.toISOString().slice(0, 10)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus:outline-none"
            />
            <button className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm text-white">
              Load Day
            </button>
          </form>
          <PrintButton label="Print Report" />
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden text-center print:block">
        <h1 className="text-2xl font-bold">Tailor Pro — Daily Sales Report</h1>
        <p className="text-sm">{dateLabel}</p>
        <p className="text-xs text-gray-400">Printed: {new Date().toLocaleString()}</p>
      </div>

      {/* KPI summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Cash In (Payments)</p>
          <p className="mt-2 text-2xl font-bold text-[var(--success)]">{formatCurrency(paymentsReceived)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{payments.length} transaction{payments.length !== 1 ? "s" : ""}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Orders Created</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(ordersValue)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Discounts Given</p>
          <p className="mt-2 text-2xl font-bold text-[var(--accent)]">{formatCurrency(discountsGiven)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">New Outstanding</p>
          <p className={`mt-2 text-2xl font-bold ${outstandingNew > 0 ? "text-[var(--primary)]" : "text-[var(--success)]"}`}>
            {formatCurrency(Math.max(outstandingNew, 0))}
          </p>
        </Card>
      </div>

      {/* Payment method breakdown */}
      {methodTotals.size > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Payments by Method</h2>
          <div className="flex flex-wrap gap-3">
            {[...methodTotals.entries()].map(([label, amount]) => (
              <div
                key={label}
                className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm"
              >
                <span className="text-[var(--muted)]">{label}</span>
                <span className="mt-1 text-lg font-bold text-[var(--success)]">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payments detail */}
      <div>
        <h2 className="mb-3 font-semibold">Payments Received ({payments.length})</h2>
        <DataTable
          headers={["Time", "Customer", "Order", "Method", "Amount", "Reference"]}
          emptyMessage="No payments recorded today."
        >
          {payments.map((p) => (
            <tr key={p.id} className="border-t border-[var(--border)]">
              <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                {p.paymentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-4 py-3 font-medium">{p.customer.fullName}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.order.orderNumber}</td>
              <td className="px-4 py-3">{p.paymentMethod.label}</td>
              <td className="px-4 py-3 font-bold text-[var(--success)]">
                {formatCurrency(toNumber(p.amount))}
              </td>
              <td className="px-4 py-3 text-[var(--muted)]">{p.referenceNo ?? "—"}</td>
            </tr>
          ))}
        </DataTable>
      </div>

      {/* Orders created today */}
      <div>
        <h2 className="mb-3 font-semibold">Orders Created Today ({orders.length})</h2>
        <DataTable
          headers={["Order #", "Customer", "Items", "Total", "Paid Today", "Balance"]}
          emptyMessage="No orders created today."
        >
          {orders.map((o) => {
            const orderTotal = o.items.reduce((s, i) => s + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount);
            const paidToday  = o.payments.reduce((s, p) => s + toNumber(p.amount), 0);
            const bal        = orderTotal - paidToday;
            return (
              <tr key={o.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
                <td className="px-4 py-3 font-medium">{o.customer.fullName}</td>
                <td className="px-4 py-3">{o.items.length}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(orderTotal)}</td>
                <td className="px-4 py-3 text-[var(--success)]">{formatCurrency(paidToday)}</td>
                <td className={`px-4 py-3 font-semibold ${bal > 0 ? "text-[var(--primary)]" : "text-[var(--success)]"}`}>
                  {formatCurrency(bal)}
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>

      {/* Closing summary */}
      <Card className="border-2 border-[var(--primary)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Total Cash Collected</p>
            <p className="text-3xl font-bold text-[var(--primary)]">{formatCurrency(paymentsReceived)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--muted)]">Total Sales Generated</p>
            <p className="text-3xl font-bold">{formatCurrency(ordersValue)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
