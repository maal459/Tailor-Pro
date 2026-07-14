"use server";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import {
  createProductSchema,
  updateProductSchema,
  productCategorySchema
} from "@/lib/validators/product";
import { productRepository } from "@/lib/repositories/product-repository";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";

function revalidateProductViews() {
  revalidatePath("/products");
  revalidatePath("/purchases");
  revalidatePath("/reports/stock");
}

async function saveProductImage(value: FormDataEntryValue | null, tenantId: string) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  // Per-tenant upload directory (defense-in-depth against filename enumeration).
  const uploadDir = join(process.cwd(), "public", "uploads", "products", tenantId);
  await mkdir(uploadDir, { recursive: true });

  const extension =
    value.type === "image/png" ? "png" : value.type === "image/webp" ? "webp" : "jpg";
  const fileName = `product-${randomUUID()}.${extension}`;
  await writeFile(join(uploadDir, fileName), buffer);

  return `/uploads/products/${tenantId}/${fileName}`;
}

function generateSku() {
  return `SKU-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

function parseProductForm(formData: FormData) {
  return {
    categoryId: String(formData.get("categoryId") ?? ""),
    supplierId: String(formData.get("supplierId") ?? ""),
    name: String(formData.get("name") ?? ""),
    sku: String(formData.get("sku") ?? "").trim(),
    costPrice: String(formData.get("costPrice") ?? ""),
    sellingPrice: String(formData.get("sellingPrice") ?? ""),
    quantity: String(formData.get("quantity") ?? "0"),
    minimumStock: String(formData.get("minimumStock") ?? "5"),
    unit: String(formData.get("unit") ?? "")
  };
}

export async function createProductAction(formData: FormData) {
  const session = await requirePermission("products.manage");

  const parsed = createProductSchema.safeParse(parseProductForm(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid product data");
  }

  const imageUrl = await saveProductImage(formData.get("image"), session.tenantId);

  try {
    const product = await productRepository.create({
      tenantId: session.tenantId,
      categoryId: parsed.data.categoryId,
      supplierId: parsed.data.supplierId || undefined,
      name: parsed.data.name,
      sku: parsed.data.sku || generateSku(),
      costPrice: parsed.data.costPrice,
      sellingPrice: parsed.data.sellingPrice,
      quantity: parsed.data.quantity,
      minimumStock: parsed.data.minimumStock,
      imageUrl: imageUrl ?? undefined,
      unit: parsed.data.unit || undefined
    });

    await logActivity({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: "Product",
      entityId: product.id,
      action: "create",
      message: `Added product "${parsed.data.name}" (${product.sku})`
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A product with this SKU already exists");
    }
    throw error;
  }

  revalidateProductViews();
}

export async function updateProductAction(productId: string, formData: FormData) {
  const session = await requirePermission("products.manage");

  const parsed = updateProductSchema.safeParse(parseProductForm(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid product data");
  }

  const existing = await productRepository.byId(session.tenantId, productId);
  if (!existing) {
    throw new Error("Product not found");
  }

  const uploadedImage = await saveProductImage(formData.get("image"), session.tenantId);
  const imageUrl =
    formData.get("removeImage") === "on" ? "" : uploadedImage ?? existing.imageUrl ?? "";

  try {
    await productRepository.update(session.tenantId, productId, {
      categoryId: parsed.data.categoryId,
      supplierId: parsed.data.supplierId || null,
      name: parsed.data.name,
      sku: parsed.data.sku || existing.sku,
      costPrice: parsed.data.costPrice,
      sellingPrice: parsed.data.sellingPrice,
      quantity: parsed.data.quantity,
      minimumStock: parsed.data.minimumStock,
      imageUrl,
      unit: parsed.data.unit || null
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A product with this SKU already exists");
    }
    throw error;
  }

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Product",
    entityId: productId,
    action: "update",
    message: `Updated product "${parsed.data.name}"`
  });

  revalidateProductViews();
  redirect("/products");
}

export async function deleteProductAction(productId: string) {
  const session = await requirePermission("products.manage");

  const existing = await productRepository.byId(session.tenantId, productId);
  if (!existing) {
    throw new Error("Product not found");
  }

  const purchaseItemCount = await prisma.purchaseItem.count({ where: { productId } });
  if (purchaseItemCount > 0) {
    throw new Error("Product has purchase history and cannot be deleted.");
  }

  await productRepository.remove(session.tenantId, productId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Product",
    entityId: productId,
    action: "delete",
    message: `Deleted product "${existing.name}" (${existing.sku})`
  });

  revalidateProductViews();
}

export async function createProductCategoryAction(formData: FormData) {
  const session = await requirePermission("products.manage");

  const parsed = productCategorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid category data");
  }

  const category = await productRepository.createCategory({
    tenantId: session.tenantId,
    name: parsed.data.name,
    description: parsed.data.description || undefined
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "ProductCategory",
    entityId: category.id,
    action: "create",
    message: `Created product category "${parsed.data.name}"`
  });

  revalidatePath("/products");
}

export async function deleteProductCategoryAction(categoryId: string) {
  const session = await requirePermission("products.manage");

  const categories = await productRepository.listCategories(session.tenantId);
  const existing = categories.find((category) => category.id === categoryId);
  if (!existing) {
    throw new Error("Category not found");
  }
  if (existing._count.products > 0) {
    throw new Error("Category has products and cannot be deleted.");
  }

  await productRepository.removeCategory(session.tenantId, categoryId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "ProductCategory",
    entityId: categoryId,
    action: "delete",
    message: `Deleted product category "${existing.name}"`
  });

  revalidatePath("/products");
}
