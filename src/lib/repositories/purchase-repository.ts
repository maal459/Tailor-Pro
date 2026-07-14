import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";

export type PurchaseListFilters = {
  query?: string;
  supplierId?: string;
  from?: Date;
  to?: Date;
};

export const purchaseRepository = {
  async list(tenantId: string, filters: PurchaseListFilters = {}, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      supplierId: filters.supplierId || undefined,
      purchaseDate:
        filters.from || filters.to
          ? { gte: filters.from, lte: filters.to }
          : undefined,
      OR: filters.query
        ? [
            { invoiceNo: { contains: filters.query } },
            { supplier: { supplierName: { contains: filters.query } } }
          ]
        : undefined
    };

    const [rows, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { supplier: true, items: { include: { product: true } } },
        orderBy: { purchaseDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.purchase.count({ where })
    ]);

    return { rows, total };
  },

  async byId(tenantId: string, id: string) {
    return prisma.purchase.findFirst({
      where: { id, tenantId },
      include: { supplier: true, items: { include: { product: true } } }
    });
  },

  /**
   * Creates the purchase with its items and increases product stock,
   * all inside a single transaction so stock never drifts from purchases.
   */
  async createWithItems(
    data: {
      tenantId: string;
      supplierId: string;
      invoiceNo?: string;
      purchaseDate?: Date;
      notes?: string;
      items: Array<{ productId: string; quantity: number; unitCost: number }>;
    },
    actorUserId?: string
  ) {
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    return prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          tenantId: data.tenantId,
          supplierId: data.supplierId,
          invoiceNo: data.invoiceNo,
          purchaseDate: data.purchaseDate,
          notes: data.notes,
          total,
          items: {
            create: data.items.map((item) => ({
              tenantId: data.tenantId,
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              subtotal: item.quantity * item.unitCost
            }))
          }
        },
        include: { supplier: true }
      });

      for (const item of data.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, tenantId: data.tenantId },
          data: { quantity: { increment: item.quantity } }
        });
        if (updated.count === 0) {
          throw new Error("Product not found for this purchase");
        }
      }

      await logActivity(
        {
          tenantId: data.tenantId,
          actorUserId,
          entityType: "Purchase",
          entityId: purchase.id,
          action: "create",
          message: `Purchase from ${purchase.supplier.supplierName} for ${total.toFixed(2)} (${data.items.length} item(s))`
        },
        tx
      );

      return purchase;
    });
  },

  /**
   * Deletes a purchase and reverses the stock increase. Refuses to delete
   * when reversing would push any product quantity below zero.
   */
  async removeWithStockReversal(tenantId: string, id: string, actorUserId?: string) {
    return prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, tenantId },
        include: { supplier: true, items: { include: { product: true } } }
      });
      if (!purchase) {
        throw new Error("Purchase not found");
      }

      for (const item of purchase.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, tenantId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } }
        });
        if (updated.count === 0) {
          throw new Error(
            `Cannot delete: reversing stock for "${item.product.name}" would make its quantity negative`
          );
        }
      }

      await tx.purchase.deleteMany({ where: { id, tenantId } });

      await logActivity(
        {
          tenantId,
          actorUserId,
          entityType: "Purchase",
          entityId: id,
          action: "delete",
          message: `Deleted purchase ${purchase.invoiceNo ?? id} from ${purchase.supplier.supplierName}`
        },
        tx
      );

      return purchase;
    });
  }
};
