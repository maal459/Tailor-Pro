"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { createUserSchema, updateUserSchema } from "@/lib/validators/user";
import { prisma } from "@/lib/db/prisma";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import { assertWithinPlanLimit } from "@/lib/billing/limits";

function formDataToPermissions(formData: FormData) {
  return formData
    .getAll("permissions")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function createUserAction(formData: FormData) {
  const session = await requirePermission("users.manage");

  const parsed = createUserSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "viewer"),
    isActive: formData.get("isActive") === "on",
    permissions: formDataToPermissions(formData)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user data");
  }

  // Enforce the tenant's subscription plan cap on staff users.
  await assertWithinPlanLimit(session.tenantId, "users");

  const permissions = parsed.data.permissions.length ? parsed.data.permissions : getPermissionsForRole(parsed.data.role);
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      tenantId: session.tenantId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      permissions,
      isActive: parsed.data.isActive
    } as any
  });

  revalidatePath("/users");
}

export async function updateUserAction(userId: string, formData: FormData) {
  const session = await requirePermission("users.manage");

  const parsed = updateUserSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "viewer"),
    isActive: formData.get("isActive") === "on",
    permissions: formDataToPermissions(formData)
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user data");
  }

  const existing = await prisma.user.findFirst({ where: { id: userId, tenantId: session.tenantId } });
  if (!existing) {
    throw new Error("User not found");
  }

  const permissions = parsed.data.permissions.length ? parsed.data.permissions : getPermissionsForRole(parsed.data.role);
  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      role: parsed.data.role,
      permissions,
      isActive: parsed.data.isActive,
      ...(passwordHash ? { passwordHash } : {})
    } as any
  });

  revalidatePath("/users");
  revalidatePath(`/users/${userId}/edit`);
}
