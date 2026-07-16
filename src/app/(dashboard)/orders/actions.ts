"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { createOrderSchema } from "@/lib/validators/order";
import { orderRepository } from "@/lib/repositories/order-repository";
import { prisma } from "@/lib/db/prisma";

const ORDER_STATES = ["PENDING", "CUTTING", "SEWING", "FINISHING", "READY", "DELIVERED", "CANCELLED"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

export async function createOrderAction(input: unknown) {
  const session = await requireAuth();
  const parsed = createOrderSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid order data");
  }

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

  await orderRepository.create({
    tenantId: session.tenantId,
    orderNumber,
    customerId: parsed.data.customerId,
    deliveryDate: parsed.data.deliveryDate ? new Date(parsed.data.deliveryDate) : undefined,
    priority: parsed.data.priority,
    status: parsed.data.status,
    discountAmount: parsed.data.discountAmount,
    notes: parsed.data.notes,
    items: parsed.data.items
  });

  revalidatePath("/orders");
  revalidatePath("/dashboard");
}

/**
 * Edits an order's workflow fields (status, priority, delivery date, discount, notes).
 * Line items are intentionally not editable here — changing them would affect payments
 * and balances, which belongs in a dedicated flow.
 */
export async function updateOrderAction(orderId: string, formData: FormData) {
  const session = await requireAuth();

  const status = String(formData.get("status") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const deliveryDate = String(formData.get("deliveryDate") ?? "");
  const discountAmount = Number(formData.get("discountAmount") ?? 0);
  const notes = String(formData.get("notes") ?? "");
  if (!ORDER_STATES.includes(status)) throw new Error("Invalid status");
  if (!PRIORITIES.includes(priority)) throw new Error("Invalid priority");

  const existing = await prisma.order.findFirst({ where: { id: orderId, tenantId: session.tenantId } });
  if (!existing) throw new Error("Order not found");

  await prisma.order.updateMany({
    where: { id: orderId, tenantId: session.tenantId },
    data: {
      status: status as never,
      priority: priority as never,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      discountAmount: Number.isFinite(discountAmount) && discountAmount >= 0 ? discountAmount : 0,
      notes: notes || null
    }
  });

  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/receivables");
  redirect(`/orders/${orderId}`);
}

export async function deleteOrderAction(orderId: string) {
  const session = await requireAuth();

  const existing = await prisma.order.findFirst({ where: { id: orderId, tenantId: session.tenantId } });
  if (!existing) throw new Error("Order not found");

  const payCount = await prisma.payment.count({ where: { tenantId: session.tenantId, orderId } });
  if (payCount > 0) {
    throw new Error("Order has payments and cannot be deleted. Delete its payments first.");
  }

  await prisma.order.deleteMany({ where: { id: orderId, tenantId: session.tenantId } });

  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath("/dashboard");
  revalidatePath("/receivables");
}
