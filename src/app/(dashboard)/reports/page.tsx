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

type OrderRow = {
  orderDate: Date;
  customerId: string;
  discountAmount: unknown;
  customer: { fullName: string };
  items: Array<{ quantity: number; unitPrice: unknown }>;
};

function buildChart(period: Period, orders: OrderRow[], from: Date, to: Date) {
  if (period === "yearly") {
    return eachMonthOfInterval({ start: from, end: to }).map((month) => ({
      name: format(month, "MMM"),
      revenue: orders
        .filter((o) => format(o.orderDate, "yyyy-MM") === format(month, "yyyy-MM"))
        .reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount), 0)
    }));
  }
  if (period === "daily") {
    return Array.from({ length: 7 }).map((_, idx) => {
      const day = subDays(new Date(), 6 - idx);
      return {
        name: format(day, "EEE"),
        revenue: orders
          .filter((o) => format(o.orderDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
          .reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount), 0)
      };
    });
  }
  return eachDayOfInterval({ start: from, end: to }).slice(0, 60).map((day) => ({
    name: format(day, "d"),
    revenue: orders
      .filter((o) => format(o.orderDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
      .reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount), 0)
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

  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: session.tenantId, orderDate: { gte: from, lte: to } },
      include: { items: true, customer: true }
    }),
    prisma.payment.findMany({
      where: { tenantId: session.tenantId, paymentDate: { gte: from, lte: to } },
      include: { customer: true }
    })
  ]);

  const totalRevenue    = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount), 0);
  const amountCollected = payments.reduce((s, p) => s + toNumber(p.amount), 0);
  const outstanding     = totalRevenue - amountCollected;
  const avgOrderValue   = orders.length ? totalRevenue / orders.length : 0;

  const customerMap = new Map<string, number>();
  for (const o of orders) {
    const v = o.items.reduce((s, i) => s + i.quantity * toNumber(i.unitPrice), 0) - toNumber(o.discountAmount);
    customerMap.set(o.customer.fullName, (customerMap.get(o.customer.fullName) ?? 0) + v);
  }
  const topCustomers = [...customerMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  const chartData = buildChart(period, orders, from, to);

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
        {" "}· {orders.length} orders
      </p>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue",       value: formatCurrency(totalRevenue)    },
          { label: "Amount Collected",    value: formatCurrency(amountCollected) },
          { label: "Outstanding Balance", value: formatCurrency(outstanding)     },
          { label: "Avg Order Value",     value: formatCurrency(avgOrderValue)   },
          { label: "Total Orders",        value: String(orders.length)           },
          { label: "Payments Received",   value: String(payments.length)         },
          { label: "Unique Customers",    value: String(new Set(orders.map((o) => o.customerId)).size) },
          { label: "Transactions",        value: String(payments.length + orders.length) },
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
