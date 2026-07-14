import { prisma } from "@/lib/db/prisma";

export const supplierRepository = {
  async list(tenantId: string, query?: string, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      OR: query
        ? [
            { supplierName: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } }
          ]
        : undefined
    };

    const [rows, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { purchases: true, products: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.supplier.count({ where })
    ]);

    return { rows, total };
  },

  async listAll(tenantId: string) {
    return prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { supplierName: "asc" }
    });
  },

  async byId(tenantId: string, id: string) {
    return prisma.supplier.findFirst({ where: { id, tenantId } });
  },

  async purchaseHistory(tenantId: string, supplierId: string) {
    const [purchases, totals] = await Promise.all([
      prisma.purchase.findMany({
        where: { tenantId, supplierId },
        include: { items: { include: { product: true } } },
        orderBy: { purchaseDate: "desc" }
      }),
      prisma.purchase.aggregate({
        where: { tenantId, supplierId },
        _sum: { total: true },
        _count: true
      })
    ]);

    return { purchases, totalAmount: totals._sum.total, purchaseCount: totals._count };
  },

  async totalsBySupplier(tenantId: string, supplierIds: string[]) {
    if (!supplierIds.length) return new Map<string, number>();
    const grouped = await prisma.purchase.groupBy({
      by: ["supplierId"],
      where: { tenantId, supplierId: { in: supplierIds } },
      _sum: { total: true }
    });
    return new Map(grouped.map((g) => [g.supplierId, Number(g._sum.total ?? 0)]));
  },

  async create(data: {
    tenantId: string;
    supplierName: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }) {
    return prisma.supplier.create({ data });
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      supplierName: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      notes?: string | null;
    }
  ) {
    return prisma.supplier.updateMany({ where: { id, tenantId }, data });
  },

  async remove(tenantId: string, id: string) {
    return prisma.supplier.deleteMany({ where: { id, tenantId } });
  }
};
