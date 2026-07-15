import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { requireAuth } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { getPlanDefinition } from "@/lib/billing/plans";
import {
  PLATFORM_NAME,
  PLATFORM_TAGLINE,
  PLATFORM_SUPPORT,
  invoiceNumber
} from "@/lib/billing/platform";
import { formatCurrency, toNumber } from "@/lib/utils";

const statusColor: Record<string, string> = {
  PAID: "#15803d",
  OVERDUE: "#dc2626",
  PENDING: "#b45309",
  CANCELLED: "#64748b"
};

export default async function SubscriptionInvoicePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const invoice = await prismaUnsafe.subscriptionInvoice.findUnique({
    where: { id },
    include: { tenant: true, payments: { orderBy: { paidAt: "asc" } } }
  });
  if (!invoice) notFound();
  // Access: the owning tenant, or a platform super-admin.
  if (invoice.tenantId !== session.tenantId && !session.isSuperAdmin) notFound();

  const def = getPlanDefinition(invoice.plan);
  const paidTotal = invoice.payments.reduce((s, p) => s + toNumber(p.amount), 0);
  const amount = toNumber(invoice.amount);
  const balance = amount - paidTotal;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";

  return (
    <div className="space-y-4">
      <style>{`@media print { header, .no-print { display:none !important; } body { background:#fff !important; } }`}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm hover:bg-black/5"
        >
          <ArrowLeft className="h-4 w-4" /> Billing
        </Link>
        <PrintButton label="Print / Save PDF" />
      </div>

      <div
        className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-8 text-gray-900 shadow-sm print:border-0 print:shadow-none"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{PLATFORM_NAME}</h1>
            <p className="text-sm text-gray-500">{PLATFORM_TAGLINE}</p>
            {PLATFORM_SUPPORT && <p className="text-xs text-gray-500">{PLATFORM_SUPPORT}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide">Invoice</p>
            <p className="font-mono text-sm">{invoiceNumber(invoice.id)}</p>
            <p
              className="mt-1 inline-block rounded px-2 py-0.5 text-xs font-bold uppercase"
              style={{ color: statusColor[invoice.status] ?? "#334155", border: `1px solid ${statusColor[invoice.status] ?? "#334155"}` }}
            >
              {invoice.status}
            </p>
          </div>
        </div>

        {/* Bill to / dates */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Billed to</p>
            <p className="mt-1 text-base font-bold">{invoice.tenant.businessName}</p>
            {invoice.tenant.ownerName && <p className="text-gray-700">{invoice.tenant.ownerName}</p>}
            {invoice.tenant.email && <p className="text-gray-700">{invoice.tenant.email}</p>}
            {invoice.tenant.phone && <p className="text-gray-700">{invoice.tenant.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Issued</p>
            <p className="mt-1">{format(invoice.issuedAt, "dd MMM yyyy")}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Due</p>
            <p>{format(invoice.dueDate, "dd MMM yyyy")}</p>
          </div>
        </div>

        {/* Line item */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                <p className="font-medium">
                  {def.label} plan — {invoice.billingCycle === "YEARLY" ? "annual" : "monthly"} subscription
                </p>
                <p className="text-xs text-gray-500">
                  Service period {format(invoice.periodStart, "dd MMM yyyy")} –{" "}
                  {format(invoice.periodEnd, "dd MMM yyyy")}
                </p>
              </td>
              <td className="py-3 text-right">{formatCurrency(amount, invoice.currency)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-medium">{formatCurrency(amount, invoice.currency)}</span>
          </div>
          {paidTotal > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Paid</span>
              <span>-{formatCurrency(paidTotal, invoice.currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-bold">
            <span>Balance due</span>
            <span style={{ color: balance > 0 ? "#b45309" : "#15803d" }}>
              {formatCurrency(Math.max(balance, 0), invoice.currency)}
            </span>
          </div>
        </div>

        {/* Pay instructions */}
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold">How to pay</p>
            <p className="mt-1">
              Pay online with ZAAD or eDahab{host ? ` at ${host}/billing` : " from your billing page"}, or
              contact {PLATFORM_NAME}
              {PLATFORM_SUPPORT ? ` (${PLATFORM_SUPPORT})` : ""} to arrange payment.
            </p>
          </div>
        )}

        <p className="mt-6 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          {PLATFORM_NAME} · Generated {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
