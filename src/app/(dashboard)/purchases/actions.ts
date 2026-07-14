"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { createPurchaseSchema } from "@/lib/validators/purchase";
import { purchaseRepository } from "@/lib/repositories/purchase-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
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

export async function deletePurchaseAction(purchaseId: string) {
  const session = await requirePermission("purchases.manage");

  const purchase = await purchaseRepository.removeWithStockReversal(
    session.tenantId,
    purchaseId,
    session.userId
  );

  revalidatePurchaseViews(purchase.supplierId);
}
