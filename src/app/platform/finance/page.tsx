import Link from "next/link";
import { headers } from "next/headers";
import { format } from "date-fns";
import {
  TrendingUp, CircleDollarSign, Wallet, AlertCircle, FileText, Receipt, Smartphone
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { StatCard } from "@/components/platform/stat-card";
import { RunBillingCycleButton } from "@/components/forms/run-billing-cycle-button";
import { RecordPaymentForm } from "@/components/forms/record-payment-form";
import { ChargeGatewayButton } from "@/components/forms/charge-gateway-button";
import { FinanceFilterBar } from "@/components/forms/finance-filter-bar";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { getBillingSummary } from "@/lib/billing/invoices";
import { configuredProviders, ALL_PROVIDERS, isSandbox, gatewayConfigStatus } from "@/lib/billing/gateway";
import { GRACE_PERIOD_DAYS, PLAN_ORDER } from "@/lib/billing/plans";
import { formatCurrency, toNumber } from "@/lib/utils";
import { generateInvoiceAction, cancelInvoiceAction } from "@/app/platform/finance/actions";

const invoiceTone: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  PENDING: "warn", OVERDUE: "danger", PAID: "success", CANCELLED: "neutral", DRAFT: "neutral"
};
const tenantTone: Record<string, "success" | "warn" | "danger"> = {
  ACTIVE: "success", SUSPENDED: "warn", CANCELLED: "danger"
};
const providerLabel: Record<string, string> = { ZAAD: "ZAAD", EDAHAB: "eDahab" };
const PLAN_VALUES = ["FREE", "BASIC", "PRO", "ENTERPRISE"];

export default async function PlatformFinancePage({
  searchParams
}: {
  searchParams: Promise<{ plan?: string; from?: string; to?: string }>;
}) {
  await requireSuperAdmin();
  const sandbox = isSandbox();
  const cfgStatus = gatewayConfigStatus();

  const params = await searchParams;
  const planFilter = PLAN_VALUES.includes(params.plan ?? "") ? params.plan : undefined;
  const fromDate = params.from ? new Date(params.from) : undefined;
  const toDate = params.to ? new Date(`${params.to}T23:59:59`) : undefined;
  const validFrom = fromDate && !Number.isNaN(fromDate.valueOf()) ? fromDate : undefined;
  const validTo = toDate && !Number.isNaN(toDate.valueOf()) ? toDate : undefined;

  const tenantWhere = {
    ...(planFilter ? { subscriptionPlan: planFilter as "FREE" | "BASIC" | "PRO" | "ENTERPRISE" } : {}),
    ...(validFrom || validTo
      ? { createdAt: { ...(validFrom ? { gte: validFrom } : {}), ...(validTo ? { lte: validTo } : {}) } }
      : {})
  };
  const filtersActive = Boolean(planFilter || validFrom || validTo);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  const [summary, tenants, openInvoices, recentPayments, providers] = await Promise.all([
    getBillingSummary(),
    prismaUnsafe.tenant.findMany({
      where: tenantWhere,
      orderBy: { businessName: "asc" },
      select: {
        id: true, businessName: true, subscriptionPlan: true, billingCycle: true,
        status: true, autoCollect: true, gatewayProvider: true, gatewayPayerRef: true,
        currentPeriodEnd: true, createdAt: true
      }
    }),
    prismaUnsafe.subscriptionInvoice.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { createdAt: "desc" }
    }),
    prismaUnsafe.subscriptionPayment.findMany({
      take: 12,
      orderBy: { paidAt: "desc" },
      include: { tenant: { select: { businessName: true } } }
    }),
    configuredProviders()
  ]);

  const openByTenant = new Map<string, (typeof openInvoices)[number]>();
  for (const inv of openInvoices) {
    if (!openByTenant.has(inv.tenantId)) openByTenant.set(inv.tenantId, inv);
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-[#1A1D2E] to-[#2A2F45] p-6 text-white">
        <div>
          <h1 className="text-2xl font-semibold">Finance</h1>
          <p className="text-sm text-white/70">Subscription revenue across all businesses</p>
        </div>
        <RunBillingCycleButton />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly recurring revenue" value={formatCurrency(summary.mrr, summary.currency)} hint={`${summary.activePaidTenants} paying businesses`} icon={TrendingUp} tone="violet" />
        <StatCard label="Collected this month" value={formatCurrency(summary.collectedThisMonth, summary.currency)} icon={CircleDollarSign} tone="green" />
        <StatCard label="Collected all-time" value={formatCurrency(summary.collectedTotal, summary.currency)} icon={Wallet} />
        <StatCard label="Outstanding" value={formatCurrency(summary.outstanding, summary.currency)} hint={`${summary.overdueCount} overdue`} icon={AlertCircle} tone={summary.overdueCount > 0 ? "red" : "default"} />
      </div>

      {/* Gateway status */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[var(--muted)]" />
            <p className="text-sm font-semibold">Online payment gateways</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sandbox && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> SANDBOX (test mode)
              </span>
            )}
            {ALL_PROVIDERS.map((p) => {
              const on = providers.includes(p);
              const label = sandbox ? "test" : on ? "live" : "not configured";
              const cls = sandbox
                ? "bg-amber-100 text-amber-700"
                : on
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500";
              const dot = sandbox ? "bg-amber-500" : on ? "bg-emerald-500" : "bg-slate-400";
              return (
                <span key={p} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {providerLabel[p]} {label}
                </span>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {sandbox
            ? "⚠ Sandbox mode is ON — online payments auto-approve without a real charge. Unset BILLING_SANDBOX before going live. "
            : providers.length === 0
              ? "Set the ZAAD_*/EDAHAB_* env vars on the server to accept online payments. "
              : "Tenants can pay online from their billing page. "}
          Configure these callback URLs at your provider:{" "}
          <code className="rounded bg-[var(--bg)] px-1">{proto}://{host}/api/billing/webhook/zaad</code>{" · "}
          <code className="rounded bg-[var(--bg)] px-1">{proto}://{host}/api/billing/webhook/edahab</code>
        </p>

        <details className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
          <summary className="cursor-pointer font-medium">Go-live setup checklist</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {cfgStatus.map((s) => (
              <div key={s.provider}>
                <p className="flex items-center gap-2 font-semibold">
                  {providerLabel[s.provider]}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.ready ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {s.ready ? "ready" : "incomplete"}
                  </span>
                </p>
                <ul className="mt-1 space-y-0.5 font-mono">
                  {s.vars.map((v) => (
                    <li key={v.name} className={v.set ? "text-emerald-600" : "text-[var(--muted)]"}>
                      {v.set ? "✓" : "○"} {v.name}
                    </li>
                  ))}
                  <li className={s.webhookSet ? "text-emerald-600" : "text-[var(--muted)]"}>
                    {s.webhookSet ? "✓" : "○"} {s.webhookVar} (webhook)
                  </li>
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[var(--muted)]">
            Set these in the server <code className="rounded bg-[var(--card)] px-1">.env</code> and restart. Money is
            credited to the merchant account your keys belong to. Verify before going live with{" "}
            <code className="rounded bg-[var(--card)] px-1">npx tsx scripts/test-gateway-connection.ts</code>.
          </p>
        </details>
      </Card>

      {/* Plan distribution */}
      <Card>
        <p className="mb-3 text-sm font-semibold">Businesses by plan</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLAN_ORDER.map((plan) => (
            <div key={plan} className="rounded-xl border border-[var(--border)] px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{plan}</p>
              <p className="text-xl font-semibold">{summary.planCounts[plan] ?? 0}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Unpaid invoices auto-suspend the business {GRACE_PERIOD_DAYS} days after the due date.
        </p>
      </Card>

      {/* Businesses & billing */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Businesses &amp; subscriptions</h2>
          <p className="text-sm text-[var(--muted)]">
            {tenants.length} business{tenants.length !== 1 ? "es" : ""}
            {filtersActive ? " (filtered)" : ""}
          </p>
        </div>
        <div className="mb-3">
          <FinanceFilterBar />
        </div>
        <DataTable
          headers={["Business", "Plan", "Status", "Joined", "Paid through", "Open invoice", "Actions"]}
          emptyMessage={filtersActive ? "No businesses match these filters." : "No businesses yet."}
        >
          {tenants.map((tenant) => {
            const open = openByTenant.get(tenant.id);
            const canCharge =
              !!open && !!tenant.gatewayProvider && !!tenant.gatewayPayerRef &&
              providers.includes(tenant.gatewayProvider as (typeof providers)[number]);
            return (
              <tr key={tenant.id} className="border-t border-[var(--border)] hover:bg-[var(--bg)]">
                <td className="px-4 py-3">
                  <div className="font-medium">{tenant.businessName}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {tenant.billingCycle}
                    {tenant.autoCollect && tenant.gatewayProvider ? ` · auto ${providerLabel[tenant.gatewayProvider] ?? tenant.gatewayProvider}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3">{tenant.subscriptionPlan}</td>
                <td className="px-4 py-3">
                  <Badge label={tenant.status} tone={tenantTone[tenant.status] ?? "neutral"} />
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {format(tenant.createdAt, "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {tenant.currentPeriodEnd ? format(tenant.currentPeriodEnd, "dd MMM yyyy") : "—"}
                </td>
                <td className="px-4 py-3">
                  {open ? (
                    <div className="flex items-center gap-2">
                      <Badge label={open.status} tone={invoiceTone[open.status] ?? "neutral"} />
                      <span className="text-sm">{formatCurrency(toNumber(open.amount), open.currency)}</span>
                      <span className="text-xs text-[var(--muted)]">due {format(open.dueDate, "dd MMM")}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {open ? (
                      <>
                        <RecordPaymentForm
                          invoiceId={open.id}
                          defaultAmount={toNumber(open.amount)}
                          currency={open.currency}
                          businessName={tenant.businessName}
                        />
                        {canCharge && (
                          <ChargeGatewayButton
                            invoiceId={open.id}
                            providerLabel={providerLabel[tenant.gatewayProvider as string] ?? (tenant.gatewayProvider as string)}
                          />
                        )}
                        <Link
                          href={`/billing/invoices/${open.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                        >
                          <FileText className="h-3.5 w-3.5" /> Invoice
                        </Link>
                        <ActionButton
                          label="Cancel"
                          confirmText="Cancel this invoice? This does not refund any payment."
                          action={cancelInvoiceAction.bind(null, open.id)}
                          successMessage="Invoice cancelled"
                          className="rounded-lg bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-500/20"
                        />
                      </>
                    ) : tenant.subscriptionPlan === "FREE" ? (
                      <span className="text-xs text-[var(--muted)]">free plan</span>
                    ) : (
                      <ActionButton
                        label="Generate invoice"
                        action={generateInvoiceAction.bind(null, tenant.id)}
                        successMessage="Invoice generated"
                        className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </div>

      {/* Recent payments */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent subscription payments</h2>
        <DataTable
          headers={["Date", "Business", "Amount", "Method", "Reference", "Receipt"]}
          emptyMessage="No payments recorded yet."
        >
          {recentPayments.map((payment) => (
            <tr key={payment.id} className="border-t border-[var(--border)] hover:bg-[var(--bg)]">
              <td className="px-4 py-3 text-[var(--muted)]">{format(payment.paidAt, "dd MMM yyyy")}</td>
              <td className="px-4 py-3 font-medium">{payment.tenant.businessName}</td>
              <td className="px-4 py-3">{formatCurrency(toNumber(payment.amount), payment.currency)}</td>
              <td className="px-4 py-3">{payment.method.replace("_", " ")}</td>
              <td className="px-4 py-3 font-mono text-xs">{payment.gatewayRef ?? "—"}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/billing/receipts/${payment.id}`}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                >
                  <Receipt className="h-3.5 w-3.5" /> Receipt
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
