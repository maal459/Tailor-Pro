import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueChart, StatusPieChart } from "@/components/dashboard-charts";
import { dashboardService } from "@/lib/services/dashboard-service";
import { requireAuth } from "@/lib/auth/guards";
import { formatCurrency, toNumber } from "@/lib/utils";

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const data = await dashboardService.summary(session.tenantId);

  const revenueSeries = data.recentOrders.map((order) => ({
    name: order.orderNumber,
    revenue:
      order.items.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0) -
      toNumber(order.discountAmount)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--muted)]">Operational and financial overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's Orders" value={String(data.todayOrders)} />
        <MetricCard label="Orders in Progress" value={String(data.inProgress)} />
        <MetricCard label="Ready for Pickup" value={String(data.ready)} />
        <MetricCard label="Delivered" value={String(data.delivered)} />
        <MetricCard label="Total Customers" value={String(data.totalCustomers)} />
        <MetricCard label="Monthly Revenue" value={formatCurrency(data.monthlyRevenue)} />
        <MetricCard label="Outstanding Balance" value={formatCurrency(data.outstandingBalances)} />
        <MetricCard label="Recent Payments" value={String(data.recentPayments.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Sales Chart</h2>
          <RevenueChart data={revenueSeries} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Order Status Summary</h2>
          <StatusPieChart data={data.statusSummary} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Recent Orders</h2>
          <div className="space-y-3">
            {data.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-[var(--muted)]">{order.customer.fullName}</p>
                </div>
                <Badge label={order.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Recent Payments</h2>
          <div className="space-y-3">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <p className="font-medium">{payment.customer.fullName}</p>
                  <p className="text-xs text-[var(--muted)]">{payment.orderId}</p>
                </div>
                <p className="font-semibold">{formatCurrency(toNumber(payment.amount))}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
