"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";
import {
  createTenantSchema,
  updateTenantSchema,
  tenantStatusSchema
} from "@/lib/validators/tenant";
import { provisionTenant } from "@/lib/tenant-provisioning";

export async function createTenantAction(input: unknown) {
  const session = await requireSuperAdmin();

  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid tenant data");
  }

  const { tenant } = await provisionTenant(parsed.data);

  await logActivity({
    tenantId: tenant.id,
    actorUserId: session.userId,
    entityType: "Tenant",
    entityId: tenant.id,
    action: "create",
    message: `Platform admin provisioned tenant "${tenant.businessName}" (${tenant.slug})`
  });

  revalidatePath("/platform/tenants");
}

export async function updateTenantAction(tenantId: string, input: unknown) {
  const session = await requireSuperAdmin();

  const parsed = updateTenantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid tenant data");
  }

  const existing = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    throw new Error("Tenant not found");
  }

  await prismaUnsafe.tenant.update({
    where: { id: tenantId },
    data: {
      businessName: parsed.data.businessName,
      ownerName: parsed.data.ownerName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      subscriptionPlan: parsed.data.subscriptionPlan,
      status: parsed.data.status
    }
  });

  await logActivity({
    tenantId,
    actorUserId: session.userId,
    entityType: "Tenant",
    entityId: tenantId,
    action: "update",
    message: `Platform admin updated tenant "${parsed.data.businessName}" (plan ${parsed.data.subscriptionPlan}, status ${parsed.data.status})`
  });

  revalidatePath("/platform/tenants");
  revalidatePath(`/platform/tenants/${tenantId}/edit`);
}

export async function setTenantStatusAction(tenantId: string, status: unknown) {
  const session = await requireSuperAdmin();

  const parsed = tenantStatusSchema.safeParse(status);
  if (!parsed.success) {
    throw new Error("Invalid status");
  }

  const existing = await prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) {
    throw new Error("Tenant not found");
  }

  await prismaUnsafe.tenant.update({ where: { id: tenantId }, data: { status: parsed.data } });

  await logActivity({
    tenantId,
    actorUserId: session.userId,
    entityType: "Tenant",
    entityId: tenantId,
    action: "update",
    message: `Platform admin set tenant "${existing.businessName}" status to ${parsed.data}`
  });

  revalidatePath("/platform/tenants");
}
