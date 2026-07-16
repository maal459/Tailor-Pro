import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { financeService } from "@/lib/services/finance-service";
import { formatCurrency, toNumber, cn } from "@/lib/utils";

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, tenantId: session.tenantId },
    include: {
      customer: true,
      items: { include: { garmentType: true } },
      payments: { include: { paymentMethod: true }, orderBy: { paymentDate: "asc" } }
    }
  });
  if (!order) notFound();

  const totals = await financeService.orderTotals(session.tenantId, id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            {order.orderNumber} <Badge label={order.status} />
          </h1>
          <p className="text-sm text-[var(--muted)]">
            <Link href={`/customers/${order.customerId}`} className="text-[var(--primary)] hover:underline">
              {order.customer.fullName}
            </Link>{" "}
            · {order.customer.phone} · ordered {format(order.orderDate, "dd MMM yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/receipts?orderId=${order.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">Receipt</Link>
          <Link href={`/orders/${order.id}/edit`} className="rounded-xl bg-[var(--violet)]/10 px-4 py-2 text-sm font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20">Edit</Link>
          <Link href="/orders" className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">← Orders</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-sm text-[var(--muted)]">Total</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(totals?.grossTotal ?? 0)}</p></Card>
        <Card><p className="text-sm text-[var(--muted)]">Paid</p><p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(totals?.paid ?? 0)}</p></Card>
        <Card><p className="text-sm text-[var(--muted)]">Balance</p><p className={cn("mt-2 text-2xl font-semibold", (totals?.balance ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>{formatCurrency(totals?.balance ?? 0)}</p></Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Delivery</p>
          <p className="mt-2 text-lg font-semibold">{order.deliveryDate ? format(order.deliveryDate, "dd MMM yyyy") : "—"}</p>
          <p className="text-xs text-[var(--muted)]">Priority: {order.priority}</p>
        </Card>
      </div>

      <Card>
        <p className="mb-3 text-sm font-semibold">Items</p>
        <DataTable headers={["Garment", "Fabric", "Qty", "Unit price", "Subtotal"]} emptyMessage="No items.">
          {order.items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-3">{item.garmentType.name}</td>
              <td className="px-4 py-3 text-[var(--muted)]">{item.fabric ?? "—"}{item.color ? ` · ${item.color}` : ""}</td>
              <td className="px-4 py-3">{item.quantity}</td>
              <td className="px-4 py-3">{formatCurrency(toNumber(item.unitPrice))}</td>
              <td className="px-4 py-3 font-medium">{formatCurrency(item.quantity * toNumber(item.unitPrice))}</td>
            </tr>
          ))}
        </DataTable>
        {toNumber(order.discountAmount) > 0 && (
          <p className="mt-2 text-right text-sm text-[var(--muted)]">Discount: −{formatCurrency(toNumber(order.discountAmount))}</p>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold">Payments</p>
        <DataTable headers={["Date", "Method", "Reference", "Amount"]} emptyMessage="No payments recorded.">
          {order.payments.map((p) => (
            <tr key={p.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-3 text-[var(--muted)]">{format(p.paymentDate, "dd MMM yyyy")}</td>
              <td className="px-4 py-3">{p.paymentMethod.label}</td>
              <td className="px-4 py-3 text-[var(--muted)]">{p.referenceNo ?? "—"}</td>
              <td className="px-4 py-3 font-medium text-emerald-600">{formatCurrency(toNumber(p.amount))}</td>
            </tr>
          ))}
        </DataTable>
      </Card>

      {order.notes && (
        <Card><p className="text-sm"><span className="text-[var(--muted)]">Notes: </span>{order.notes}</p></Card>
      )}
    </div>
  );
}
