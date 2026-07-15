import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, FileText, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { PaySubscriptionForm } from "@/components/forms/pay-subscription-form";
import { requireAuth } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { getPlanPricing } from "@/lib/billing/pricing";
import { getPlanDefinition } from "@/lib/billing/plans";
import { configuredProviders } from "@/lib/billing/gateway";
import { invoiceNumber } from "@/lib/billing/platform";
import { formatCurrency, toNumber } from "@/lib/utils";

const invoiceTone: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  PENDING: "warn",
  OVERDUE: "danger",
  PAID: "success",
  CANCELLED: "neutral"
};

export default async function TenantBillingPage() {
  const session = await requireAuth();

  const [tenant, invoices, payments, providers] = await Promise.all([
    prismaUnsafe.tenant.findUnique({ where: { id: session.tenantId } }),
    prismaUnsafe.subscriptionInvoice.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prismaUnsafe.subscriptionPayment.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { paidAt: "desc" }
    }),
    configuredProviders()
  ]);

  if (!tenant) return null;

  const pricing = await getPlanPricing(tenant.subscriptionPlan);
  const def = getPlanDefinition(tenant.subscriptionPlan);
  const open = invoices.find((i) => i.status === "PENDING" || i.status === "OVERDUE");
  const receiptByInvoice = new Map<string, string>();
  for (const p of payments) {
    if (p.invoiceId && !receiptByInvoice.has(p.invoiceId)) receiptByInvoice.set(p.invoiceId, p.id);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {tenant.status === "SUSPENDED" && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Your account is suspended for non-payment.</p>
            <p>Settle the outstanding invoice below to restore access to your dashboard immediately.</p>
          </div>
        </div>
      )}

      {/* Plan summary */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Current plan</p>
            <p className="text-2xl font-semibold">{def.label}</p>
            <p className="text-sm text-[var(--muted)]">{def.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold">
              {tenant.subscriptionPlan === "FREE"
                ? "Free"
                : formatCurrency(
                    tenant.billingCycle === "YEARLY" ? pricing.yearlyPrice : pricing.monthlyPrice,
                    pricing.currency
                  )}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {tenant.billingCycle === "YEARLY" ? "per year" : "per month"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--border)] pt-4 text-sm">
          <span className="text-[var(--muted)]">
            Status: <Badge label={tenant.status} tone={tenant.status === "ACTIVE" ? "success" : "danger"} />
          </span>
          <span className="text-[var(--muted)]">
            Paid through:{" "}
            <strong className="text-[var(--text)]">
              {tenant.currentPeriodEnd ? format(tenant.currentPeriodEnd, "dd MMM yyyy") : "—"}
            </strong>
          </span>
        </div>
      </Card>

      {/* Outstanding invoice + pay */}
      {open ? (
        <Card className="border-2 border-[var(--primary)]/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Outstanding invoice</p>
              <p className="text-xs text-[var(--muted)]">
                {invoiceNumber(open.id)} · due {format(open.dueDate, "dd MMM yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">{formatCurrency(toNumber(open.amount), open.currency)}</p>
              <Badge label={open.status} tone={invoiceTone[open.status] ?? "neutral"} />
            </div>
          </div>

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <PaySubscriptionForm
              invoiceId={open.id}
              amountLabel={formatCurrency(toNumber(open.amount), open.currency)}
              defaultPayer={tenant.gatewayPayerRef ?? ""}
              availableProviders={providers}
            />
          </div>

          <div className="mt-3">
            <Link
              href={`/billing/invoices/${open.id}`}
              className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
            >
              <FileText className="h-4 w-4" /> View / print invoice
            </Link>
          </div>
        </Card>
      ) : (
        tenant.subscriptionPlan !== "FREE" && (
          <Card>
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">You&apos;re all paid up. Thank you!</p>
            </div>
          </Card>
        )
      )}

      {/* Invoice history */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Billing history</h2>
        <DataTable
          headers={["Invoice", "Period", "Amount", "Status", "Documents"]}
          emptyMessage="No invoices yet."
        >
          {invoices.map((inv) => {
            const receiptId = receiptByInvoice.get(inv.id);
            return (
              <tr key={inv.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono text-xs">{invoiceNumber(inv.id)}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {format(inv.periodStart, "dd MMM")} – {format(inv.periodEnd, "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">{formatCurrency(toNumber(inv.amount), inv.currency)}</td>
                <td className="px-4 py-3">
                  <Badge label={inv.status} tone={invoiceTone[inv.status] ?? "neutral"} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <Link
                      href={`/billing/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> Invoice
                    </Link>
                    {receiptId && (
                      <Link
                        href={`/billing/receipts/${receiptId}`}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" /> Receipt
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>
    </div>
  );
}
