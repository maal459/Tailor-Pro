import { startOfDay, endOfDay, startOfMonth } from "date-fns";
import { OrderState } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";

export const dashboardService = {
  async summary(tenantId: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [todayOrders, inProgress, ready, delivered, totalCustomers, recentPayments, recentOrders, monthOrders] =
      await Promise.all([
        prisma.order.count({ where: { tenantId, orderDate: { gte: todayStart, lte: todayEnd } } }),
        prisma.order.count({ where: { tenantId, status: { in: [OrderState.CUTTING, OrderState.SEWING, OrderState.FINISHING] } } }),
        prisma.order.count({ where: { tenantId, status: OrderState.READY } }),
        prisma.order.count({ where: { tenantId, status: OrderState.DELIVERED } }),
        prisma.customer.count({ where: { tenantId } }),
        prisma.payment.findMany({ where: { tenantId }, include: { customer: true }, orderBy: { paymentDate: "desc" }, take: 8 }),
        prisma.order.findMany({ where: { tenantId }, include: { customer: true, items: true, payments: true }, orderBy: { orderDate: "desc" }, take: 8 }),
        prisma.order.findMany({
          where: { tenantId, orderDate: { gte: startOfMonth(now) } },
          include: { items: true, payments: true }
        })
      ]);

    const monthlyRevenue = monthOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((acc, item) => acc + item.quantity * toNumber(item.unitPrice), 0) - toNumber(order.discountAmount);
      return sum + orderTotal;
    }, 0);

    const outstandingBalances = monthOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((acc, item) => acc + item.quantity * toNumber(item.unitPrice), 0) - toNumber(order.discountAmount);
      const paid = order.payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);
      return sum + Math.max(orderTotal - paid, 0);
    }, 0);

    const statusSummary = Object.values(OrderState).map((status) => ({
      status,
      count: monthOrders.filter((order) => order.status === status).length
    }));

    return {
      todayOrders,
      inProgress,
      ready,
      delivered,
      totalCustomers,
      monthlyRevenue,
      outstandingBalances,
      recentPayments,
      recentOrders,
      statusSummary
    };
  }
};
