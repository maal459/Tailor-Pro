"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { createSupplierSchema, updateSupplierSchema } from "@/lib/validators/supplier";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";

export async function createSupplierAction(formData: FormData) {
  const session = await requirePermission("suppliers.manage");

  const parsed = createSupplierSchema.safeParse({
    supplierName: String(formData.get("supplierName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier data");
  }

  const supplier = await supplierRepository.create({
    tenantId: session.tenantId,
    supplierName: parsed.data.supplierName,
    phone: parsed.data.phone || undefined,
    email: parsed.data.email || undefined,
    address: parsed.data.address || undefined,
    notes: parsed.data.notes || undefined
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Supplier",
    entityId: supplier.id,
    action: "create",
    message: `Added supplier "${parsed.data.supplierName}"`
  });

  revalidatePath("/suppliers");
}

export async function updateSupplierAction(supplierId: string, formData: FormData) {
  const session = await requirePermission("suppliers.manage");

  const parsed = updateSupplierSchema.safeParse({
    supplierName: String(formData.get("supplierName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier data");
  }

  const existing = await supplierRepository.byId(session.tenantId, supplierId);
  if (!existing) {
    throw new Error("Supplier not found");
  }

  await supplierRepository.update(session.tenantId, supplierId, {
    supplierName: parsed.data.supplierName,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    notes: parsed.data.notes || null
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Supplier",
    entityId: supplierId,
    action: "update",
    message: `Updated supplier "${parsed.data.supplierName}"`
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
  redirect("/suppliers");
}

export async function deleteSupplierAction(supplierId: string) {
  const session = await requirePermission("suppliers.manage");

  const existing = await supplierRepository.byId(session.tenantId, supplierId);
  if (!existing) {
    throw new Error("Supplier not found");
  }

  const purchaseCount = await prisma.purchase.count({
    where: { tenantId: session.tenantId, supplierId }
  });
  if (purchaseCount > 0) {
    throw new Error("Supplier has purchase records and cannot be deleted.");
  }

  await supplierRepository.remove(session.tenantId, supplierId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Supplier",
    entityId: supplierId,
    action: "delete",
    message: `Deleted supplier "${existing.supplierName}"`
  });

  revalidatePath("/suppliers");
}
