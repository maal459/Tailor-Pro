import { addMonths, addYears, startOfMonth, subDays } from "date-fns";
import type { BillingCycle, InvoiceStatus, SubscriptionPaymentMethod } from "@prisma/client";
import { prismaUnsafe } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";
import { toNumber } from "@/lib/utils";
import { GRACE_PERIOD_DAYS, monthlyEquivalent, PLAN_ORDER } from "@/lib/billing/plans";
import { getEffectivePricing, priceForCycle } from "@/lib/billing/pricing";
import { getGateway, PROVIDER_METHOD } from "@/lib/billing/gateway";

const OPEN_STATUSES: InvoiceStatus[] = ["PENDING", "OVERDUE"];

function periodEndFrom(start: Date, cycle: BillingCycle): Date {
  return cycle === "YEARLY" ? addYears(start, 1) : addMonths(start, 1);
}

export type GenerateResult =
  | { created: true; invoiceId: string }
  | { created: false; reason: "free-plan" | "open-invoice"; invoiceId?: string };

/**
 * Issues the next subscription invoice for a tenant. Idempotent-ish: a FREE tenant is
 * never billed, and a tenant with an already-open (PENDING/OVERDUE) invoice is not
 * double-billed. The new period starts where the paid-through date ends (or today).
 */
export async function generateInvoiceForTenant(
  tenantId: string,
  opts: { now?: Date; actorEmail?: string } = {}
): Promise<GenerateResult> {
  const now = opts.now ?? new Date();
  const tenant = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");
  if (tenant.subscriptionPlan === "FREE") return { created: false, reason: "free-plan" };

  const open = await prismaUnsafe.subscriptionInvoice.findFirst({
    where: { tenantId, status: { in: OPEN_STATUSES } },
    orderBy: { createdAt: "desc" }
  });
  if (open) return { created: false, reason: "open-invoice", invoiceId: open.id };

  const pricing = (await getEffectivePricing())[tenant.subscriptionPlan];
  const amount = priceForCycle(pricing, tenant.billingCycle);

  const periodStart =
    tenant.currentPeriodEnd && tenant.currentPeriodEnd > now ? tenant.currentPeriodEnd : now;
  const periodEnd = periodEndFrom(periodStart, tenant.billingCycle);

  const invoice = await prismaUnsafe.subscriptionInvoice.create({
    data: {
      tenantId,
      plan: tenant.subscriptionPlan,
      billingCycle: tenant.billingCycle,
      amount,
      currency: pricing.currency,
      periodStart,
      periodEnd,
      dueDate: periodStart,
      status: "PENDING"
    }
  });

  await logActivity({
    tenantId,
    entityType: "SubscriptionInvoice",
    entityId: invoice.id,
    action: "create",
    message: `Subscription invoice issued: ${pricing.currency} ${amount} (${tenant.subscriptionPlan}, ${tenant.billingCycle})${opts.actorEmail ? ` by ${opts.actorEmail}` : ""}`
  });

  return { created: true, invoiceId: invoice.id };
}

export type RecordPaymentInput = {
  method: SubscriptionPaymentMethod;
  amount?: number;
  gatewayProvider?: string | null;
  gatewayRef?: string | null;
  paidAt?: Date;
  recordedBy?: string | null;
  notes?: string | null;
};

/**
 * Marks an invoice paid: records a SubscriptionPayment, advances the tenant's
 * paid-through date, and reactivates the tenant if it had been suspended for
 * non-payment. Runs in a transaction so the ledger and tenant state never diverge.
 */
export async function markInvoicePaid(invoiceId: string, input: RecordPaymentInput) {
  const invoice = await prismaUnsafe.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "PAID") throw new Error("Invoice is already paid");
  if (invoice.status === "CANCELLED") throw new Error("Cannot pay a cancelled invoice");

  const tenant = await prismaUnsafe.tenant.findUnique({ where: { id: invoice.tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  const amount = input.amount ?? toNumber(invoice.amount);
  const paidAt = input.paidAt ?? new Date();

  await prismaUnsafe.$transaction([
    prismaUnsafe.subscriptionPayment.create({
      data: {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        amount,
        currency: invoice.currency,
        method: input.method,
        gatewayProvider: input.gatewayProvider ?? null,
        gatewayRef: input.gatewayRef ?? null,
        paidAt,
        recordedBy: input.recordedBy ?? null,
        notes: input.notes ?? null
      }
    }),
    prismaUnsafe.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt }
    }),
    prismaUnsafe.tenant.update({
      where: { id: invoice.tenantId },
      data: {
        currentPeriodEnd: invoice.periodEnd,
        // Paying clears a non-payment suspension; an intentionally CANCELLED tenant stays put.
        ...(tenant.status === "SUSPENDED" ? { status: "ACTIVE" as const } : {})
      }
    })
  ]);

  await logActivity({
    tenantId: invoice.tenantId,
    entityType: "SubscriptionInvoice",
    entityId: invoice.id,
    action: "update",
    message: `Subscription payment recorded: ${invoice.currency} ${amount} via ${input.method}${tenant.status === "SUSPENDED" ? " — tenant reactivated" : ""}`
  });
}

export type BillingCycleReport = {
  markedOverdue: number;
  autoCollected: Array<{ tenantId: string; invoiceId: string; message: string }>;
  autoCollectFailed: Array<{ tenantId: string; invoiceId: string; message: string }>;
  suspended: Array<{ tenantId: string; businessName: string }>;
};

/**
 * The dunning run — safe to invoke repeatedly (cron or the "Run billing cycle" button):
 *  1. attempt automatic gateway collection for tenants that opted in;
 *  2. flag still-unpaid, past-due invoices as OVERDUE;
 *  3. suspend tenants whose invoice has been overdue longer than the grace period.
 */
export async function runBillingCycle(
  opts: { now?: Date; graceDays?: number; attemptAutoCollect?: boolean } = {}
): Promise<BillingCycleReport> {
  const now = opts.now ?? new Date();
  const graceDays = opts.graceDays ?? GRACE_PERIOD_DAYS;
  const attemptAutoCollect = opts.attemptAutoCollect ?? true;

  const report: BillingCycleReport = {
    markedOverdue: 0,
    autoCollected: [],
    autoCollectFailed: [],
    suspended: []
  };

  // 1. Automatic collection for opted-in tenants with an open, due invoice.
  if (attemptAutoCollect) {
    const candidates = await prismaUnsafe.subscriptionInvoice.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        dueDate: { lte: now },
        tenant: { autoCollect: true, gatewayProvider: { not: null }, status: "ACTIVE" }
      },
      include: { tenant: true }
    });

    for (const invoice of candidates) {
      const provider = invoice.tenant.gatewayProvider;
      const payerRef = invoice.tenant.gatewayPayerRef;
      const gateway = await getGateway(provider);
      if (!gateway || !gateway.isConfigured() || !payerRef) continue;

      const result = await gateway.charge({
        tenantId: invoice.tenantId,
        amount: toNumber(invoice.amount),
        currency: invoice.currency,
        payerRef,
        reference: invoice.id,
        description: `Tailor Pro ${invoice.plan} subscription`
      });

      if (result.success) {
        await markInvoicePaid(invoice.id, {
          method: PROVIDER_METHOD[gateway.provider],
          gatewayProvider: gateway.provider,
          gatewayRef: result.gatewayRef,
          recordedBy: "auto-collect",
          notes: "Automatic gateway collection"
        });
        report.autoCollected.push({ tenantId: invoice.tenantId, invoiceId: invoice.id, message: result.message });
      } else {
        report.autoCollectFailed.push({ tenantId: invoice.tenantId, invoiceId: invoice.id, message: result.message });
      }
    }
  }

  // 2. Flag past-due, still-unpaid invoices as OVERDUE.
  const overdue = await prismaUnsafe.subscriptionInvoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: now } },
    data: { status: "OVERDUE" }
  });
  report.markedOverdue = overdue.count;

  // 3. Suspend tenants overdue beyond the grace period.
  const cutoff = subDays(now, graceDays);
  const stale = await prismaUnsafe.subscriptionInvoice.findMany({
    where: { status: "OVERDUE", dueDate: { lt: cutoff } },
    select: { tenantId: true }
  });
  const tenantIds = [...new Set(stale.map((row) => row.tenantId))];

  for (const tenantId of tenantIds) {
    const tenant = await prismaUnsafe.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true, businessName: true }
    });
    if (tenant?.status !== "ACTIVE") continue;

    await prismaUnsafe.tenant.update({ where: { id: tenantId }, data: { status: "SUSPENDED" } });
    await logActivity({
      tenantId,
      entityType: "Tenant",
      entityId: tenantId,
      action: "update",
      message: `Auto-suspended for non-payment (invoice overdue more than ${graceDays} days)`
    });
    report.suspended.push({ tenantId, businessName: tenant.businessName });
  }

  return report;
}

export type BillingSummary = {
  currency: string;
  mrr: number;
  activePaidTenants: number;
  collectedThisMonth: number;
  collectedTotal: number;
  outstanding: number;
  overdueCount: number;
  planCounts: Record<string, number>;
};

/** Aggregates for the platform finance dashboard. */
export async function getBillingSummary(now: Date = new Date()): Promise<BillingSummary> {
  const pricing = await getEffectivePricing();
  const tenants = await prismaUnsafe.tenant.findMany({
    select: { subscriptionPlan: true, billingCycle: true, status: true }
  });

  let mrr = 0;
  let activePaidTenants = 0;
  const planCounts: Record<string, number> = {};
  for (const plan of PLAN_ORDER) planCounts[plan] = 0;

  for (const t of tenants) {
    planCounts[t.subscriptionPlan] = (planCounts[t.subscriptionPlan] ?? 0) + 1;
    if (t.status === "ACTIVE" && t.subscriptionPlan !== "FREE") {
      const p = pricing[t.subscriptionPlan];
      mrr += monthlyEquivalent(p.monthlyPrice, p.yearlyPrice, t.billingCycle);
      activePaidTenants += 1;
    }
  }

  const [thisMonth, allTime, outstanding, overdueCount] = await Promise.all([
    prismaUnsafe.subscriptionPayment.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: startOfMonth(now) } }
    }),
    prismaUnsafe.subscriptionPayment.aggregate({ _sum: { amount: true } }),
    prismaUnsafe.subscriptionInvoice.aggregate({
      _sum: { amount: true },
      where: { status: { in: OPEN_STATUSES } }
    }),
    prismaUnsafe.subscriptionInvoice.count({ where: { status: "OVERDUE" } })
  ]);

  return {
    currency: "USD",
    mrr,
    activePaidTenants,
    collectedThisMonth: toNumber(thisMonth._sum.amount ?? 0),
    collectedTotal: toNumber(allTime._sum.amount ?? 0),
    outstanding: toNumber(outstanding._sum.amount ?? 0),
    overdueCount,
    planCounts
  };
}
