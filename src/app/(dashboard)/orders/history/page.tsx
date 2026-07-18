import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";
import { CustomerHistorySelector } from "@/components/forms/customer-history-selector";

type SearchParams = Promise<{ customerId?: string }>;

export default async function OrderHistoryPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const selectedCustomerId = params.customerId ?? "";

  const [customer, orders, payments] = selectedCustomerId
    ? await Promise.all([
        prisma.customer.findFirst({
          where: { id: selectedCustomerId, tenantId: session.tenantId }
        }),
        prisma.order.findMany({
          where: { tenantId: session.tenantId, customerId: selectedCustomerId },
          include: { items: true, payments: true },
          orderBy: { orderDate: "desc" }
        }),
        prisma.payment.findMany({
          where: { tenantId: session.tenantId, customerId: selectedCustomerId },
          orderBy: { paymentDate: "desc" }
        })
      ])
    : [null, [], []];

  const totalOrders = orders.length;
  const totalOrderedAmount = orders.reduce((sum, order) => {
    const orderTotal = order.items.reduce((itemSum, item) => itemSum + item.quantity * toNumber(item.unitPrice), 0);
    return sum + orderTotal - toNumber(order.discountAmount);
  }, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const outstanding = totalOrderedAmount - totalPaid;
  const lastOrderDate = orders[0]?.orderDate ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Order History</h1>
        <p className="text-sm text-[var(--muted)]">See how many orders each customer has made and what they owe</p>
      </div>

      <Card className="no-print">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Search customer</label>
            <CustomerHistorySelector
              selectedId={selectedCustomerId}
              initialLabel={customer ? `${customer.phone} · ${customer.fullName}` : ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="p-3">
              <p className="text-xs text-[var(--muted)]">Total Orders</p>
              <p className="mt-1 text-xl font-bold">{totalOrders}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-[var(--muted)]">Total Ordered</p>
              <p className="mt-1 text-xl font-bold">{formatCurrency(totalOrderedAmount)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-[var(--muted)]">Total Paid</p>
              <p className="mt-1 text-xl font-bold text-[var(--success)]">{formatCurrency(totalPaid)}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-[var(--muted)]">Outstanding</p>
              <p className={`mt-1 text-xl font-bold ${outstanding > 0 ? "text-[var(--primary)]" : "text-[var(--success)]"}`}>
                {formatCurrency(outstanding)}
              </p>
            </Card>
          </div>
        </div>
      </Card>

      {customer ? (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                  {customer.customerNumber}
                </p>
                <h2 className="text-2xl font-bold">{customer.fullName}</h2>
                <p className="text-sm text-[var(--muted)]">{customer.phone} {customer.city ? `• ${customer.city}` : ""}</p>
              </div>
              <div className="text-right text-sm text-[var(--muted)]">
                <p>Last order: {lastOrderDate ? lastOrderDate.toLocaleDateString() : "-"}</p>
                <p>Order count: {totalOrders}</p>
              </div>
            </div>
          </Card>

          <DataTable
            headers={["Order #", "Date", "Delivery", "Status", "Priority", "Items", "Total", "Paid", "Balance"]}
            emptyMessage="No orders found for this customer."
          >
            {orders.map((order) => {
              const orderTotal = order.items.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0) - toNumber(order.discountAmount);
              const paid = order.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
              const balance = orderTotal - paid;

              return (
                <tr key={order.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{order.orderDate.toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{order.deliveryDate ? order.deliveryDate.toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{order.status}</td>
                  <td className="px-4 py-3">{order.priority}</td>
                  <td className="px-4 py-3">{order.items.length}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(orderTotal)}</td>
                  <td className="px-4 py-3 text-[var(--success)]">{formatCurrency(paid)}</td>
                  <td className={`px-4 py-3 font-semibold ${balance > 0 ? "text-[var(--primary)]" : "text-[var(--success)]"}`}>
                    {formatCurrency(balance)}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </>
      ) : (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">Select a customer to view order history.</p>
        </Card>
      )}
    </div>
  );
}
