"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { createPurchaseSchema } from "@/lib/validators/purchase";
import { purchaseRepository } from "@/lib/repositories/purchase-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";

function revalidatePurchaseViews(supplierId?: string) {
  revalidatePath("/purchases");
  revalidatePath("/products");
  revalidatePath("/suppliers");
  if (supplierId) revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/reports/purchases");
  revalidatePath("/reports/stock");
  revalidatePath("/reports/profit-loss");
}

export async function createPurchaseAction(input: unknown) {
  const session = await requirePermission("purchases.manage");

  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid purchase data");
  }

  const supplier = await supplierRepository.byId(session.tenantId, parsed.data.supplierId);
  if (!supplier) {
    throw new Error("Supplier not found");
  }

  await purchaseRepository.createWithItems(
    {
      tenantId: session.tenantId,
      supplierId: parsed.data.supplierId,
      invoiceNo: parsed.data.invoiceNo || undefined,
      purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
      notes: parsed.data.notes || undefined,
      items: parsed.data.items
    },
    session.userId
  );

  revalidatePurchaseViews(parsed.data.supplierId);
}

/**
 * Edits a purchase's header fields (supplier, invoice no, date, notes). Line items and
 * their stock impact are not editable here — that would require reversing and re-applying
 * stock, which belongs in a dedicated flow. Delete + recreate for item changes.
 */
export async function updatePurchaseAction(purchaseId: string, formData: FormData) {
  const session = await requirePermission("purchases.manage");

  const supplierId = String(formData.get("supplierId") ?? "");
  const invoiceNo = String(formData.get("invoiceNo") ?? "").trim();
  const purchaseDate = String(formData.get("purchaseDate") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!supplierId) throw new Error("Supplier is required");

  const existing = await prisma.purchase.findFirst({ where: { id: purchaseId, tenantId: session.tenantId } });
  if (!existing) throw new Error("Purchase not found");
  const supplier = await supplierRepository.byId(session.tenantId, supplierId);
  if (!supplier) throw new Error("Supplier not found");

  await prisma.purchase.updateMany({
    where: { id: purchaseId, tenantId: session.tenantId },
    data: {
      supplierId,
      invoiceNo: invoiceNo || null,
      notes: notes || null,
      ...(purchaseDate ? { purchaseDate: new Date(purchaseDate) } : {})
    }
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Purchase",
    entityId: purchaseId,
    action: "update",
    message: `Updated purchase ${invoiceNo || purchaseId}`
  });

  revalidatePurchaseViews(supplierId);
  redirect(`/purchases/${purchaseId}`);
}

export async function deletePurchaseAction(purchaseId: string) {
  const session = await requirePermission("purchases.manage");

  const purchase = await purchaseRepository.removeWithStockReversal(
    session.tenantId,
    purchaseId,
    session.userId
  );

  revalidatePurchaseViews(purchase.supplierId);
}
