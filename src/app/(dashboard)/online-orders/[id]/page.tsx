import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { requirePermission } from "@/lib/auth/guards";
import { onlineOrderRepository } from "@/lib/repositories/online-order-repository";
import { prisma } from "@/lib/db/prisma";
import { ONLINE_ORDER_STATUSES } from "@/lib/validators/online-order";
import { formatCurrency, toNumber } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { linkOnlineOrderCustomerAction, updateOnlineOrderStatusAction } from "@/app/(dashboard)/online-orders/actions";
import { DeleteOnlineOrderButton } from "@/app/(dashboard)/online-orders/[id]/delete-button";

const STATUS_ACTION_LABEL: Record<(typeof ONLINE_ORDER_STATUSES)[number], string> = {
  NEW: "Mark as new",
  CONFIRMED: "Confirm",
  COMPLETED: "Mark completed",
  CANCELLED: "Cancel order"
};

export default async function OnlineOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("orders.manage");
  const { id } = await params;
  const t = await getT();

  const order = await onlineOrderRepository.byId(session.tenantId, id);
  if (!order) notFound();

  const matchingCustomer = order.customer
    ? null
    : await prisma.customer.findFirst({
        where: { tenantId: session.tenantId, phone: order.phone },
        select: { id: true, fullName: true },
        orderBy: { createdAt: "asc" }
      });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/online-orders" className="text-sm text-[var(--muted)] hover:underline">
            ← {t("Online Orders")}
          </Link>
          <h1 className="text-2xl font-semibold">{t("Online Order {number}", { number: order.orderNumber })}</h1>
          <p className="text-sm text-[var(--muted)]">{t("Placed {date}", { date: format(order.createdAt, "dd MMM yyyy, HH:mm") })}</p>
        </div>
        <Badge label={order.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 text-sm">
          <p className="text-base font-semibold">{t("Customer")}</p>
          <p>
            <span className="text-[var(--muted)]">{t("Name")}: </span>
            {order.customerName}
          </p>
          <p>
            <span className="text-[var(--muted)]">{t("Phone")}: </span>
            {order.phone}
          </p>
          {order.email && (
            <p>
              <span className="text-[var(--muted)]">{t("Email")}: </span>
              {order.email}
            </p>
          )}
          {order.address && (
            <p>
              <span className="text-[var(--muted)]">{t("Address")}: </span>
              {order.address}
            </p>
          )}
          <div className="border-t border-[var(--border)] pt-2">
            {order.customer ? (
              <p>
                <span className="text-[var(--muted)]">{t("Customer record:")} </span>
                <Link href={`/customers/${order.customer.id}`} className="font-medium text-[var(--primary)] hover:underline">
                  {order.customer.fullName} ({order.customer.customerNumber})
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--muted)]">
                  {matchingCustomer
                    ? t("Existing customer with this phone: {name}", { name: matchingCustomer.fullName })
                    : t("Not linked to a customer record.")}
                </span>
                <ActionButton
                  label={matchingCustomer ? t("Link to customer") : t("Save as customer")}
                  action={linkOnlineOrderCustomerAction.bind(null, order.id)}
                  successMessage={t("Customer linked")}
                  className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="space-y-3 text-sm">
          <p className="text-base font-semibold">{t("Status")}</p>
          <div className="flex flex-wrap gap-2">
            {ONLINE_ORDER_STATUSES.filter((s) => s !== order.status).map((s) => (
              <ActionButton
                key={s}
                label={t(STATUS_ACTION_LABEL[s])}
                action={updateOnlineOrderStatusAction.bind(null, order.id, s)}
                successMessage={t("Order marked {status}", { status: t(s) })}
                confirmText={s === "CANCELLED" ? t("Cancel this order?") : undefined}
                className={
                  s === "CANCELLED"
                    ? "rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20"
                    : "rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-black/5"
                }
              />
            ))}
          </div>
          {order.notes && (
            <div className="border-t border-[var(--border)] pt-2">
              <p className="text-[var(--muted)]">{t("Customer notes")}</p>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
          <div className="border-t border-[var(--border)] pt-2">
            <DeleteOnlineOrderButton orderId={order.id} orderNumber={order.orderNumber} />
          </div>
        </Card>
      </div>

      <DataTable
        headers={[t("Product"), t("Unit price"), t("Qty"), t("In stock now"), t("Subtotal")]}
        emptyMessage={t("No items.")}
      >
        {order.items.map((item) => (
          <tr key={item.id} className="border-t border-[var(--border)]">
            <td className="px-4 py-3 font-medium">
              {item.product ? (
                <Link href={`/products/${item.product.id}/edit`} className="hover:underline">
                  {item.productName}
                </Link>
              ) : (
                <>
                  {item.productName} <span className="text-xs text-[var(--muted)]">({t("deleted")})</span>
                </>
              )}
            </td>
            <td className="px-4 py-3">{formatCurrency(toNumber(item.unitPrice))}</td>
            <td className="px-4 py-3">{item.quantity}</td>
            <td className="px-4 py-3">{item.product ? item.product.quantity : "—"}</td>
            <td className="px-4 py-3">{formatCurrency(toNumber(item.subtotal))}</td>
          </tr>
        ))}
        <tr className="border-t border-[var(--border)] font-semibold">
          <td className="px-4 py-3" colSpan={4}>
            {t("Total")}
          </td>
          <td className="px-4 py-3">{formatCurrency(toNumber(order.total))}</td>
        </tr>
      </DataTable>
    </div>
  );
}
