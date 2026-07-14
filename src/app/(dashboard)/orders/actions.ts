"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { createOrderSchema } from "@/lib/validators/order";
import { orderRepository } from "@/lib/repositories/order-repository";

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
