"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { ONLINE_ORDER_STATUSES } from "@/lib/validators/online-order";
import { logActivity } from "@/lib/activity-log";
import { getT } from "@/lib/i18n/server";

function revalidateOnlineOrderViews(orderId: string) {
  revalidatePath("/online-orders");
  revalidatePath(`/online-orders/${orderId}`);
  revalidatePath("/notifications");
}

export async function updateOnlineOrderStatusAction(orderId: string, status: string) {
  const session = await requirePermission("orders.manage");
  if (!(ONLINE_ORDER_STATUSES as readonly string[]).includes(status)) throw new Error((await getT())("Invalid status"));

  const existing = await prisma.onlineOrder.findFirst({ where: { id: orderId, tenantId: session.tenantId } });
  if (!existing) throw new Error((await getT())("Online order not found"));

  await prisma.onlineOrder.updateMany({
    where: { id: orderId, tenantId: session.tenantId },
    data: { status: status as (typeof ONLINE_ORDER_STATUSES)[number] }
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "OnlineOrder",
    entityId: orderId,
    action: "update",
    message: `Online order ${existing.orderNumber} marked ${status}`
  });

  revalidateOnlineOrderViews(orderId);
}

/**
 * Links the online order to a Customer record: reuses an existing customer with the same
 * phone number, otherwise creates one from the details the shopper typed.
 */
export async function linkOnlineOrderCustomerAction(orderId: string) {
  const session = await requirePermission("orders.manage");

  const order = await prisma.onlineOrder.findFirst({ where: { id: orderId, tenantId: session.tenantId } });
  if (!order) throw new Error((await getT())("Online order not found"));
  if (order.customerId) return;

  let customer = await prisma.customer.findFirst({
    where: { tenantId: session.tenantId, phone: order.phone },
    orderBy: { createdAt: "asc" }
  });

  if (!customer) {
    await assertWithinPlanLimit(session.tenantId, "customers");
    customer = await customerRepository.create({
      tenantId: session.tenantId,
      customerNumber: `CUST-${Date.now().toString().slice(-6)}`,
      fullName: order.customerName,
      phone: order.phone,
      email: order.email ?? undefined,
      address: order.address ?? undefined,
      notes: `Created from online order ${order.orderNumber}`
    });
  }

  await prisma.onlineOrder.updateMany({
    where: { id: orderId, tenantId: session.tenantId },
    data: { customerId: customer.id }
  });

  revalidateOnlineOrderViews(orderId);
  revalidatePath("/customers");
}

export async function deleteOnlineOrderAction(orderId: string) {
  const session = await requirePermission("orders.manage");

  const existing = await prisma.onlineOrder.findFirst({ where: { id: orderId, tenantId: session.tenantId } });
  if (!existing) throw new Error((await getT())("Online order not found"));

  await prisma.onlineOrderItem.deleteMany({ where: { tenantId: session.tenantId, onlineOrderId: orderId } });
  await prisma.onlineOrder.deleteMany({ where: { id: orderId, tenantId: session.tenantId } });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "OnlineOrder",
    entityId: orderId,
    action: "delete",
    message: `Deleted online order ${existing.orderNumber}`
  });

  revalidatePath("/online-orders");
}
