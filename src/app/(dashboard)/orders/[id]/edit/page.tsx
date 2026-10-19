import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { updateOrderAction } from "@/app/(dashboard)/orders/actions";
import { getT } from "@/lib/i18n/server";

const STATES = ["PENDING", "CUTTING", "SEWING", "FINISHING", "READY", "DELIVERED", "CANCELLED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default async function EditOrderPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const t = await getT();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { customer: true }
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Edit Order {number}", { number: order.orderNumber })}</h1>
        <p className="text-sm text-[var(--muted)]">{order.customer.fullName}</p>
      </div>

      <Card>
        <p className="mb-3 text-xs text-[var(--muted)]">
          {t("Editing workflow & pricing fields. To change garments, create a new order.")}
        </p>
        <form action={updateOrderAction.bind(null, id)} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("Status")}</span>
            <Select name="status" defaultValue={order.status}>
              {STATES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("Priority")}</span>
            <Select name="priority" defaultValue={order.priority}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t(p)}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("Delivery date")}</span>
            <Input type="date" name="deliveryDate" defaultValue={order.deliveryDate ? format(order.deliveryDate, "yyyy-MM-dd") : ""} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">{t("Discount")}</span>
            <Input type="number" step="0.01" min="0" name="discountAmount" defaultValue={String(toNumber(order.discountAmount))} />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">{t("Notes")}</span>
            <Input name="notes" defaultValue={order.notes ?? ""} />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">{t("Save changes")}</Button>
            <Link href={`/orders/${id}`} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">{t("Cancel")}</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
