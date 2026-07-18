import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { OrderForm } from "@/components/forms/order-form";
import { requireAuth } from "@/lib/auth/guards";
import { orderRepository } from "@/lib/repositories/order-repository";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";
import { deleteOrderAction } from "@/app/(dashboard)/orders/actions";

export default async function OrdersPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const page = Number(params.page ?? "1");

  const [orders, garmentTypes] = await Promise.all([
    orderRepository.list(session.tenantId, page, 10),
    prisma.garmentType.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } })
  ]);

  const pageCount = Math.max(1, Math.ceil(orders.total / 10));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-[var(--muted)]">Create and manage production workflow orders</p>
        </div>
        <a
          href="/api/exports/orders.csv"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
        >
          Export CSV
        </a>
      </div>

      <Card>
        <OrderForm
          garmentTypes={garmentTypes.map((garmentType) => ({ id: garmentType.id, label: garmentType.name }))}
        />
      </Card>

      <DataTable
        headers={["Order #", "Customer", "Status", "Priority", "Total", "Paid", "Balance", "Delivery", "Actions"]}
      >
        {orders.rows.map((order) => {
          const total =
            order.items.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0) -
            toNumber(order.discountAmount);
          const paid = order.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
          const balance = total - paid;

          return (
            <tr key={order.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
              <td className="px-4 py-3 font-medium">{order.customer.fullName}</td>
              <td className="px-4 py-3">
                <Badge label={order.status} />
              </td>
              <td className="px-4 py-3">
                <Badge label={order.priority} />
              </td>
              <td className="px-4 py-3">{formatCurrency(total)}</td>
              <td className="px-4 py-3 text-[var(--success)]">{formatCurrency(paid)}</td>
              <td className={`px-4 py-3 font-semibold ${balance > 0 ? "text-[var(--primary)]" : "text-[var(--success)]"}`}>
                {formatCurrency(balance)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                  >
                    View
                  </Link>
                  <Link
                    href={`/orders/${order.id}/edit`}
                    className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                  >
                    Edit
                  </Link>
                  <ActionButton
                    label="Delete"
                    confirmText={`Delete order ${order.orderNumber}?`}
                    action={deleteOrderAction.bind(null, order.id)}
                    successMessage="Order deleted"
                    className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20"
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>

      <div className="flex items-center justify-between text-sm">
        <p>
          Page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <a className="rounded-lg border px-3 py-1" href={`/orders?page=${Math.max(1, page - 1)}`}>
            Prev
          </a>
          <a className="rounded-lg border px-3 py-1" href={`/orders?page=${Math.min(pageCount, page + 1)}`}>
            Next
          </a>
        </div>
      </div>
    </div>
  );
}
