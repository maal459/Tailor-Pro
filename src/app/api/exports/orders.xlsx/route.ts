import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/guards";

export async function GET() {
  const session = await requireAuth();
  const orders = await prisma.order.findMany({
    where: { tenantId: session.tenantId },
    include: { customer: true, items: true, payments: true },
    orderBy: { orderDate: "desc" },
    take: 5000
  });

  const header = "Order Number\tCustomer\tStatus\tPriority\tOrder Date\tDelivery Date\tTotal\tPaid\tBalance";
  const rows = orders.map((order) => {
    const total = order.items.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0) - toNumber(order.discountAmount);
    const paid = order.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const balance = total - paid;

    return [
      order.orderNumber,
      order.customer.fullName,
      order.status,
      order.priority,
      order.orderDate.toISOString(),
      order.deliveryDate?.toISOString() ?? "",
      total,
      paid,
      balance
    ].join("\t");
  });

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=orders.xls"
    }
  });
}
