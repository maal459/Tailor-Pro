import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PrintButton } from "@/components/ui/print-button";
import { CustomerHistorySelector } from "@/components/forms/customer-history-selector";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function PaymentHistoryPage({
  searchParams
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const session = await requireAuth();
  const params  = await searchParams;

  const selectedId = params.customerId ?? "";

  // Per-customer data only — the customer picker searches server-side, so this page
  // never loads the whole customer list.
  const [customer, payments, orders] = selectedId
    ? await Promise.all([
        prisma.customer.findFirst({ where: { id: selectedId, tenantId: session.tenantId } }),
        prisma.payment.findMany({
          where:   { tenantId: session.tenantId, customerId: selectedId },
          include: { order: true, paymentMethod: true },
          orderBy: { paymentDate: "asc" }
        }),
        prisma.order.findMany({
          where:   { tenantId: session.tenantId, customerId: selectedId },
          include: { items: true }
        })
      ])
    : [null, [], []];

  const totalOrdered = orders.reduce((sum, o) => {
    return sum + o.items.reduce((s, i) => s + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount);
  }, 0);
  const totalPaid    = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
  const balance      = totalOrdered - totalPaid;

  // running balance
  let running = 0;
  const rows = payments.map((p) => {
    running += toNumber(p.amount);
    return { ...p, running };
  });

  return (
    <div className="space-y-6">
      {/* page title + print */}
      <div className="flex flex-wrap items-start justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Payment History</h1>
          <p className="text-sm text-[var(--muted)]">Full payment record per customer — printable</p>
        </div>
        {selectedId && <PrintButton label="Print History" />}
      </div>

      {/* customer selector (server-backed, phone-first) */}
      <Card className="print:hidden">
        <CustomerHistorySelector
          basePath="/payments/history"
          selectedId={selectedId}
          initialLabel={customer ? `${customer.phone} · ${customer.fullName}` : ""}
        />
      </Card>

      {customer && (
        <>
          {/* printable customer header */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                  {customer.customerNumber}
                </p>
                <h2 className="text-xl font-bold">{customer.fullName}</h2>
                <p className="text-sm text-[var(--muted)]">{customer.phone}</p>
              </div>
              <div className="text-right text-sm">
                <p>
                  Printed: <strong>{new Date().toLocaleDateString()}</strong>
                </p>
              </div>
            </div>

            {/* summary cards */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Total Ordered</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(totalOrdered)}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Total Paid</p>
                <p className="mt-1 text-lg font-semibold text-[var(--success)]">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted)]">Outstanding Balance</p>
                <p className={`mt-1 text-lg font-semibold ${balance > 0 ? "text-[var(--primary)]" : "text-[var(--success)]"}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </div>

          {/* payment history table */}
          {rows.length > 0 ? (
            <DataTable
              headers={["#", "Date", "Order", "Method", "Amount", "Cumulative Paid", "Reference", "Notes"]}
            >
              {rows.map((p, i) => (
                <tr key={p.id} className="border-t border-[var(--border)] hover:bg-[var(--bg)]">
                  <td className="px-4 py-3 text-[var(--muted)]">{i + 1}</td>
                  <td className="whitespace-nowrap px-4 py-3">{p.paymentDate.toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.order.orderNumber}</td>
                  <td className="px-4 py-3">{p.paymentMethod.label}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--success)]">
                    {formatCurrency(toNumber(p.amount))}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(p.running)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{p.referenceNo ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{p.notes ?? "—"}</td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <Card>
              <p className="py-6 text-center text-sm text-[var(--muted)]">
                No payments recorded for this customer.
              </p>
            </Card>
          )}
        </>
      )}

      {!customer && selectedId === "" && (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            Select a customer above to view their full payment history.
          </p>
        </Card>
      )}

      <Link
        href="/payments"
        className="print:hidden inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
      >
        ← Back to Payments
      </Link>
    </div>
  );
}
