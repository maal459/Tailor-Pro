"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validators/customer";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";

export async function createCustomerAction(formData: FormData) {
  const session = await requireAuth();

  const payload = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    alternativePhone: String(formData.get("alternativePhone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    notes: String(formData.get("notes") ?? "")
  };

  const parsed = createCustomerSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid customer data");
  }

  // Enforce the tenant's subscription plan cap on customers.
  await assertWithinPlanLimit(session.tenantId, "customers");

  const timestamp = Date.now().toString().slice(-6);
  await customerRepository.create({
    tenantId: session.tenantId,
    customerNumber: `CUST-${timestamp}`,
    ...parsed.data,
    email: parsed.data.email || undefined
  });

  revalidatePath("/customers");
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const session = await requireAuth();

  const parsed = updateCustomerSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    alternativePhone: String(formData.get("alternativePhone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid customer data");
  }

  const existing = await customerRepository.byId(session.tenantId, customerId);
  if (!existing) throw new Error("Customer not found");

  await customerRepository.update(session.tenantId, customerId, {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    alternativePhone: parsed.data.alternativePhone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    city: parsed.data.city || null,
    notes: parsed.data.notes || null
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Customer",
    entityId: customerId,
    action: "update",
    message: `Updated customer "${parsed.data.fullName}"`
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteCustomerAction(customerId: string) {
  const session = await requireAuth();

  const existing = await customerRepository.byId(session.tenantId, customerId);
  if (!existing) throw new Error("Customer not found");

  const [orderCount, paymentCount] = await Promise.all([
    prisma.order.count({ where: { tenantId: session.tenantId, customerId } }),
    prisma.payment.count({ where: { tenantId: session.tenantId, customerId } })
  ]);
  if (orderCount > 0 || paymentCount > 0) {
    throw new Error("Customer has orders or payments and cannot be deleted.");
  }

  await customerRepository.remove(session.tenantId, customerId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Customer",
    entityId: customerId,
    action: "delete",
    message: `Deleted customer "${existing.fullName}"`
  });

  revalidatePath("/customers");
}
