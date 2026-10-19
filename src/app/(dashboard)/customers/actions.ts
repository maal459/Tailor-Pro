"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth/guards";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validators/customer";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { assertWithinPlanLimit } from "@/lib/billing/limits";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";

export type CreateCustomerResult = { ok: true } | { ok: false; error: string };

// customerNumber is unique across all tenants, so a timestamp-only number can collide.
function nextCustomerNumber(attempt: number) {
  const timestamp = Date.now().toString().slice(-6);
  if (attempt === 0) return `CUST-${timestamp}`;
  return `CUST-${timestamp}${Math.floor(Math.random() * 900 + 100)}`;
}

/**
 * Returns a result instead of throwing: errors thrown from a server action are
 * redacted in production and crash the page, so the form would show nothing useful.
 */
export async function createCustomerAction(formData: FormData): Promise<CreateCustomerResult> {
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid customer data" };
  }

  try {
    // Enforce the tenant's subscription plan cap on customers.
    await assertWithinPlanLimit(session.tenantId, "customers");
  } catch (error) {
    // Its messages are written to be shown to the user.
    return { ok: false, error: error instanceof Error ? error.message : "Plan limit reached" };
  }

  try {
    const data = {
      tenantId: session.tenantId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      alternativePhone: parsed.data.alternativePhone || undefined,
      email: parsed.data.email || undefined,
      address: parsed.data.address || undefined,
      city: parsed.data.city || undefined,
      notes: parsed.data.notes || undefined
    };

    let customer: Awaited<ReturnType<typeof customerRepository.create>> | undefined;
    for (let attempt = 0; !customer; attempt++) {
      try {
        customer = await customerRepository.create({ ...data, customerNumber: nextCustomerNumber(attempt) });
      } catch (error) {
        const isNumberClash =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4;
        if (!isNumberClash) throw error;
      }
    }

    await logActivity({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: "Customer",
      entityId: customer.id,
      action: "create",
      message: `Added customer "${customer.fullName}" (${customer.customerNumber})`
    });
  } catch (error) {
    console.error("createCustomerAction failed", error);
    return { ok: false, error: "Could not save the customer. Please try again." };
  }

  revalidatePath("/customers");
  return { ok: true };
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
