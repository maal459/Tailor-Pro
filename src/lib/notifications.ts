import { endOfDay, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  type: "dueToday" | "lateOrder" | "outstanding" | "recentPayment";
  createdAt: Date;
  href: string;
};

export async function buildNotificationItems(tenantId: string, seenAt?: Date | null) {
  const now = new Date();
  const threshold = seenAt ?? subDays(now, 7);

  const [dueToday, lateOrders, outstandingOrders, recentPayments] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        deliveryDate: { gte: startOfDay(now), lte: endOfDay(now) },
        status: { notIn: ["DELIVERED", "CANCELLED"] }
      },
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
      take: 10
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        deliveryDate: { lt: startOfDay(now) },
        status: { notIn: ["DELIVERED", "CANCELLED"] }
      },
      include: { customer: true },
      orderBy: { deliveryDate: "asc" },
      take: 10
    }),
    prisma.order.findMany({
      where: { tenantId },
      include: { customer: true, items: true, payments: true },
      orderBy: { updatedAt: "desc" },
      take: 10
    }),
    prisma.payment.findMany({
      where: { tenantId, paymentDate: { gte: threshold } },
      include: { customer: true, order: true },
      orderBy: { paymentDate: "desc" },
      take: 10
    })
  ]);

  const items: NotificationItem[] = [];

  for (const order of dueToday) {
    items.push({
      id: `due-${order.id}`,
      title: "Order due today",
      description: `${order.orderNumber} for ${order.customer.fullName}`,
      type: "dueToday",
      createdAt: order.updatedAt,
      href: "/notifications"
    });
  }

  for (const order of lateOrders) {
    items.push({
      id: `late-${order.id}`,
      title: "Late order",
      description: `${order.orderNumber} for ${order.customer.fullName}`,
      type: "lateOrder",
      createdAt: order.deliveryDate ?? order.updatedAt,
      href: "/notifications"
    });
  }

  for (const order of outstandingOrders) {
    const total = order.items.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0) - toNumber(order.discountAmount);
    const paid = order.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const balance = total - paid;

    if (balance > 0.01) {
      items.push({
        id: `outstanding-${order.id}`,
        title: "Outstanding balance",
        description: `${order.customer.fullName} owes $${balance.toFixed(2)} on ${order.orderNumber}`,
        type: "outstanding",
        createdAt: order.updatedAt,
        href: "/ledger"
      });
    }
  }

  for (const payment of recentPayments) {
    items.push({
      id: `payment-${payment.id}`,
      title: "Payment received",
      description: `${payment.customer.fullName} paid $${toNumber(payment.amount).toFixed(2)} for ${payment.order.orderNumber}`,
      type: "recentPayment",
      createdAt: payment.paymentDate,
      href: "/payments/history"
    });
  }

  const unreadItems = items.filter((item) => item.createdAt > threshold);

  return {
    items: items.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, 10),
    unreadCount: unreadItems.length
  };
}
