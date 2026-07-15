import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { requireAuth } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { getPlanDefinition } from "@/lib/billing/plans";
import {
  PLATFORM_NAME,
  PLATFORM_TAGLINE,
  PLATFORM_SUPPORT,
  invoiceNumber,
  receiptNumber
} from "@/lib/billing/platform";
import { formatCurrency, toNumber } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  ZAAD: "ZAAD",
  EDAHAB: "eDahab",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  MANUAL: "Manual",
  OTHER: "Other"
};

export default async function SubscriptionReceiptPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const payment = await prismaUnsafe.subscriptionPayment.findUnique({
    where: { id },
    include: { tenant: true, invoice: true }
  });
  if (!payment) notFound();
  if (payment.tenantId !== session.tenantId && !session.isSuperAdmin) notFound();

  const def = payment.invoice ? getPlanDefinition(payment.invoice.plan) : null;

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
        <div className="flex items-start justify-between border-b-2 border-green-700 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{PLATFORM_NAME}</h1>
            <p className="text-sm text-gray-500">{PLATFORM_TAGLINE}</p>
            {PLATFORM_SUPPORT && <p className="text-xs text-gray-500">{PLATFORM_SUPPORT}</p>}
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1 text-lg font-bold uppercase tracking-wide text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Receipt
            </p>
            <p className="font-mono text-sm">{receiptNumber(payment.id)}</p>
          </div>
        </div>

        {/* Paid amount */}
        <div className="mt-6 rounded-xl bg-green-50 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Amount paid</p>
          <p className="mt-1 text-3xl font-bold text-green-800">
            {formatCurrency(toNumber(payment.amount), payment.currency)}
          </p>
          <p className="mt-1 text-sm text-green-700">{format(payment.paidAt, "dd MMMM yyyy, HH:mm")}</p>
        </div>

        {/* Details */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Received from</p>
            <p className="mt-1 font-bold">{payment.tenant.businessName}</p>
            {payment.tenant.email && <p className="text-gray-700">{payment.tenant.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payment method</p>
            <p className="mt-1">{METHOD_LABEL[payment.method] ?? payment.method}</p>
            {payment.gatewayRef && (
              <p className="font-mono text-xs text-gray-500">Ref: {payment.gatewayRef}</p>
            )}
          </div>
        </div>

        {/* What it's for */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="pb-2 font-medium">For</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                <p className="font-medium">
                  {def ? `${def.label} plan subscription` : "Subscription payment"}
                </p>
                {payment.invoice && (
                  <p className="text-xs text-gray-500">
                    Invoice {invoiceNumber(payment.invoice.id)} · period{" "}
                    {format(payment.invoice.periodStart, "dd MMM")} –{" "}
                    {format(payment.invoice.periodEnd, "dd MMM yyyy")}
                  </p>
                )}
              </td>
              <td className="py-3 text-right">{formatCurrency(toNumber(payment.amount), payment.currency)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-8 text-center text-sm font-medium text-gray-600">
          Thank you for your payment.
        </p>
        <p className="mt-2 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          {PLATFORM_NAME} · Generated {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
