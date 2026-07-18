import {
  startOfDay, endOfDay,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subDays, format, eachDayOfInterval, eachMonthOfInterval
} from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RevenueChart } from "@/components/dashboard-charts";
import { PrintButton } from "@/components/ui/print-button";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber, cn } from "@/lib/utils";

type Period = "daily" | "monthly" | "yearly" | "custom";

function getRange(period: Period, fromParam?: string, toParam?: string) {
  const now = new Date();
  switch (period) {
    case "daily":   return { from: startOfDay(now),  to: endOfDay(now)  };
    case "yearly":  return { from: startOfYear(now), to: endOfYear(now) };
    case "custom":  return {
      from: fromParam ? startOfDay(new Date(fromParam)) : startOfMonth(now),
      to:   toParam   ? endOfDay(new Date(toParam))     : endOfDay(now)
    };
    default:        return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

/** Chart from per-bucket revenue computed in SQL (keys: yyyy-MM for yearly, else yyyy-MM-dd). */
function buildChart(period: Period, revenueByBucket: Map<string, number>, from: Date, to: Date) {
  if (period === "yearly") {
    return eachMonthOfInterval({ start: from, end: to }).map((month) => ({
      name: format(month, "MMM"),
      revenue: revenueByBucket.get(format(month, "yyyy-MM")) ?? 0
    }));
  }
  if (period === "daily") {
    return Array.from({ length: 7 }).map((_, idx) => {
      const day = subDays(new Date(), 6 - idx);
      return {
        name: format(day, "EEE"),
        revenue: revenueByBucket.get(format(day, "yyyy-MM-dd")) ?? 0
      };
    });
  }
  return eachDayOfInterval({ start: from, end: to }).slice(0, 60).map((day) => ({
    name: format(day, "d"),
    revenue: revenueByBucket.get(format(day, "yyyy-MM-dd")) ?? 0
  }));
}

const TABS: { id: Period; label: string }[] = [
  { id: "daily",   label: "Daily"   },
  { id: "monthly", label: "Monthly" },
  { id: "yearly",  label: "Yearly"  },
  { id: "custom",  label: "Custom"  },
];

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await requireAuth();
  const params  = await searchParams;
  const period  = (params.period ?? "monthly") as Period;
  const { from, to } = getRange(period, params.from, params.to);

  // All figures are aggregated in the database — with years of history this page must
  // never pull every order/payment row into Node.
  const tenantId = session.tenantId;
  const bucketFmt = period === "yearly" ? "%Y-%m" : "%Y-%m-%d";

  const [payAgg, orderGroups, revenueRaw, bucketItemsRaw, bucketDiscRaw, topRaw] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { tenantId, paymentDate: { gte: from, lte: to } }
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      _count: { _all: true },
      where: { tenantId, orderDate: { gte: from, lte: to } }
    }),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT
         (SELECT COALESCE(SUM(oi.quantity * oi.unitPrice), 0) FROM \`OrderItem\` oi
            JOIN \`Order\` o ON o.id = oi.orderId
           WHERE o.tenantId = ? AND o.orderDate BETWEEN ? AND ?) AS items,
         (SELECT COALESCE(SUM(discountAmount), 0) FROM \`Order\`
           WHERE tenantId = ? AND orderDate BETWEEN ? AND ?) AS discounts`,
      tenantId, from, to, tenantId, from, to
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT DATE_FORMAT(o.orderDate, ?) AS bucket, SUM(oi.quantity * oi.unitPrice) AS gross
         FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
        WHERE o.tenantId = ? AND o.orderDate BETWEEN ? AND ?
        GROUP BY bucket`,
      bucketFmt, tenantId, from, to
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT DATE_FORMAT(orderDate, ?) AS bucket, SUM(discountAmount) AS disc
         FROM \`Order\` WHERE tenantId = ? AND orderDate BETWEEN ? AND ?
        GROUP BY bucket`,
      bucketFmt, tenantId, from, to
    ),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT c.fullName AS name, (COALESCE(it.t, 0) - COALESCE(d.t, 0)) AS total
         FROM \`Customer\` c
         JOIN (SELECT o.customerId cid, SUM(oi.quantity * oi.unitPrice) t
                 FROM \`OrderItem\` oi JOIN \`Order\` o ON o.id = oi.orderId
                WHERE o.tenantId = ? AND o.orderDate BETWEEN ? AND ? GROUP BY o.customerId) it ON it.cid = c.id
         LEFT JOIN (SELECT customerId cid, SUM(discountAmount) t
                 FROM \`Order\` WHERE tenantId = ? AND orderDate BETWEEN ? AND ? GROUP BY customerId) d ON d.cid = c.id
        WHERE c.tenantId = ?
        ORDER BY total DESC LIMIT 5`,
      tenantId, from, to, tenantId, from, to, tenantId
    )
  ]);

  const orderCount      = orderGroups.reduce((s, g) => s + g._count._all, 0);
  const uniqueCustomers = orderGroups.length;
  const paymentCount    = payAgg._count._all;
  const totalRevenue    = toNumber(revenueRaw[0]?.items) - toNumber(revenueRaw[0]?.discounts);
  const amountCollected = toNumber(payAgg._sum.amount ?? 0);
  const outstanding     = totalRevenue - amountCollected;
  const avgOrderValue   = orderCount ? totalRevenue / orderCount : 0;

  const revenueByBucket = new Map<string, number>();
  for (const r of bucketItemsRaw) revenueByBucket.set(String(r.bucket), toNumber(r.gross));
  for (const r of bucketDiscRaw) {
    const key = String(r.bucket);
    revenueByBucket.set(key, (revenueByBucket.get(key) ?? 0) - toNumber(r.disc));
  }

  const topCustomers = topRaw
    .map((r) => ({ name: String(r.name), total: toNumber(r.total) }))
    .filter((c) => c.total > 0);

  const chartData = buildChart(period, revenueByBucket, from, to);

  const chartTitle =
    period === "yearly" ? "Revenue by Month" :
    period === "daily"  ? "Last 7 Days"      :
                          "Revenue by Day";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sales Reports</h1>
          <p className="text-sm text-[var(--muted)]">Revenue, collections, and customer trends</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/exports/orders.csv"  className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5">CSV</a>
          <a href="/api/exports/orders.xlsx" className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5">Excel</a>
          <PrintButton label="PDF" />
        </div>
      </div>

      {/* Period tab bar */}
      <div className="flex gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/reports?period=${tab.id}`}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-center text-sm font-medium transition-all",
              period === tab.id
                ? "bg-[var(--primary)] text-white shadow"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Custom date picker */}
      {period === "custom" && (
        <Card>
          <form className="flex flex-wrap items-center gap-3" method="get">
            <input type="hidden" name="period" value="custom" />
            <input
              type="date" name="from"
              defaultValue={from.toISOString().slice(0, 10)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus:outline-none"
            />
            <input
              type="date" name="to"
              defaultValue={to.toISOString().slice(0, 10)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus:outline-none"
            />
            <button className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm text-white">Apply</button>
          </form>
        </Card>
      )}

      <p className="text-sm text-[var(--muted)]">
        {format(from, "dd MMM yyyy")} – {format(to, "dd MMM yyyy")}
        {" "}· {orderCount} orders
      </p>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue",       value: formatCurrency(totalRevenue)    },
          { label: "Amount Collected",    value: formatCurrency(amountCollected) },
          { label: "Outstanding Balance", value: formatCurrency(outstanding)     },
          { label: "Avg Order Value",     value: formatCurrency(avgOrderValue)   },
          { label: "Total Orders",        value: String(orderCount)              },
          { label: "Payments Received",   value: String(paymentCount)            },
          { label: "Unique Customers",    value: String(uniqueCustomers)         },
          { label: "Transactions",        value: String(paymentCount + orderCount) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{chartTitle}</h2>
          <RevenueChart data={chartData} />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Top Customers</h2>
          <div className="space-y-2">
            {topCustomers.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="text-sm">{c.name}</span>
                <strong className="text-sm">{formatCurrency(c.total)}</strong>
              </div>
            ))}
            {!topCustomers.length && <p className="text-sm text-[var(--muted)]">No orders in this period.</p>}
          </div>
        </Card>
      </div>

      {/* Financial reports */}
      <div className="flex flex-wrap gap-2">
        <a href="/reports/daily" className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">
          Daily Transactions Report →
        </a>
        <a href="/reports/expenses" className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">
          Expense Report →
        </a>
        <a href="/reports/salaries" className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">
          Salary Report →
        </a>
        <a href="/reports/purchases" className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">
          Purchase Report →
        </a>
        <a href="/reports/stock" className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">
          Stock Report →
        </a>
        <a href="/reports/profit-loss" className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">
          Profit / Loss Report →
        </a>
      </div>
    </div>
  );
}
