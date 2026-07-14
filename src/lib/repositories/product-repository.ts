import { prisma } from "@/lib/db/prisma";

export type ProductListFilters = {
  query?: string;
  categoryId?: string;
  stock?: "low" | "out";
};

export const productRepository = {
  async list(tenantId: string, filters: ProductListFilters = {}, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      categoryId: filters.categoryId || undefined,
      OR: filters.query
        ? [{ name: { contains: filters.query } }, { sku: { contains: filters.query } }]
        : undefined,
      ...(filters.stock === "out" ? { quantity: { lte: 0 } } : {})
    };

    const [allRows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, supplier: true },
        orderBy: { createdAt: "desc" },
        ...(filters.stock === "low"
          ? {}
          : { skip: (page - 1) * pageSize, take: pageSize })
      }),
      prisma.product.count({ where })
    ]);

    // "low stock" compares two columns, which Prisma cannot filter on directly
    if (filters.stock === "low") {
      const lowRows = allRows.filter((p) => p.quantity > 0 && p.quantity <= p.minimumStock);
      return {
        rows: lowRows.slice((page - 1) * pageSize, page * pageSize),
        total: lowRows.length
      };
    }

    return { rows: allRows, total };
  },

  async listAll(tenantId: string) {
    return prisma.product.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    });
  },

  async byId(tenantId: string, id: string) {
    return prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true, supplier: true }
    });
  },

  async create(data: {
    tenantId: string;
    categoryId: string;
    supplierId?: string;
    name: string;
    sku: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    minimumStock: number;
    imageUrl?: string;
    unit?: string;
  }) {
    return prisma.product.create({ data });
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      categoryId: string;
      supplierId?: string | null;
      name: string;
      sku: string;
      costPrice: number;
      sellingPrice: number;
      quantity: number;
      minimumStock: number;
      imageUrl?: string;
      unit?: string | null;
    }
  ) {
    return prisma.product.updateMany({ where: { id, tenantId }, data });
  },

  async remove(tenantId: string, id: string) {
    return prisma.product.deleteMany({ where: { id, tenantId } });
  },

  async listCategories(tenantId: string) {
    return prisma.productCategory.findMany({
      where: { tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" }
    });
  },

  async createCategory(data: { tenantId: string; name: string; description?: string }) {
    return prisma.productCategory.create({ data });
  },

  async removeCategory(tenantId: string, id: string) {
    return prisma.productCategory.deleteMany({ where: { id, tenantId } });
  }
};
