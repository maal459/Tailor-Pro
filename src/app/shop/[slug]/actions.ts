"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { getBusinessSettings } from "@/lib/settings";
import { placeOnlineOrderSchema } from "@/lib/validators/online-order";
import { onlineOrderRepository } from "@/lib/repositories/online-order-repository";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";
import { toNumber } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

export type PlaceOnlineOrderResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string; unavailableProductIds?: string[] };

function generateOrderNumber() {
  return `WEB-${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;
}

/**
 * Public, unauthenticated order placement. The tenant is resolved from the shop slug
 * (never from client input), and prices/names are read from the database so the
 * client can only choose which products and how many.
 *
 * Returns a result object instead of throwing: Next masks thrown errors from server
 * actions in production, and customers need to see why an order was refused.
 */
export async function placeOnlineOrderAction(slug: string, input: unknown): Promise<PlaceOnlineOrderResult> {
  const t = await getT();
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "";
  // Spam guard: 10 orders / 15 min per IP. Fails open when the IP is unknown, like login.
  if (ip && !rateLimit(`shop-order:${ip}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: t("Too many orders from this device. Please try again later.") };
  }

  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status !== "ACTIVE") {
    return { ok: false, error: t("This shop is not available.") };
  }
  const settings = await getBusinessSettings(tenant.id);
  if (!settings.onlineShopEnabled) {
    return { ok: false, error: t("This shop is not accepting online orders right now.") };
  }

  const parsed = placeOnlineOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t(parsed.error.issues[0]?.message ?? "Invalid order details") };
  }
  const data = parsed.data;

  // Bots fill every field; quietly pretend success so they don't retry.
  if (data.website) {
    return { ok: true, orderNumber: generateOrderNumber(), total: 0 };
  }

  // Merge duplicate lines for the same product.
  const quantities = new Map<string, number>();
  for (const item of data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, id: { in: [...quantities.keys()] } },
    select: { id: true, name: true, sellingPrice: true, quantity: true }
  });
  if (products.length !== quantities.size) {
    const found = new Set(products.map((product) => product.id));
    return {
      ok: false,
      error: t("Some products in your cart are no longer available and were removed. Please review your cart."),
      unavailableProductIds: [...quantities.keys()].filter((id) => !found.has(id))
    };
  }

  const items = [];
  for (const product of products) {
    const quantity = quantities.get(product.id)!;
    if (quantity > product.quantity) {
      return {
        ok: false,
        error:
          product.quantity > 0
            ? t('Only {count} of "{name}" left in stock.', { count: product.quantity, name: product.name })
            : t('"{name}" is out of stock.', { name: product.name })
      };
    }
    const unitPrice = toNumber(product.sellingPrice);
    items.push({
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity,
      subtotal: Math.round(unitPrice * quantity * 100) / 100
    });
  }
  const total = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;

  const order = await onlineOrderRepository.create({
    tenantId: tenant.id,
    orderNumber: generateOrderNumber(),
    customerName: data.customerName,
    phone: data.phone,
    email: data.email || undefined,
    address: data.address || undefined,
    notes: data.notes || undefined,
    total,
    items
  });

  await logActivity({
    tenantId: tenant.id,
    entityType: "OnlineOrder",
    entityId: order.id,
    action: "create",
    message: `Online order ${order.orderNumber} placed by ${data.customerName} (${data.phone})`
  });

  revalidatePath("/online-orders");

  return { ok: true, orderNumber: order.orderNumber, total };
}
