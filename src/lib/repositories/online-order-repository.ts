import type { OnlineOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type OnlineOrderListFilters = {
  query?: string;
  status?: OnlineOrderStatus;
};

export const onlineOrderRepository = {
  async list(tenantId: string, filters: OnlineOrderListFilters = {}, page = 1, pageSize = 20) {
    const where = {
      tenantId,
      status: filters.status,
      OR: filters.query
        ? [
            { orderNumber: { contains: filters.query } },
            { customerName: { contains: filters.query } },
            { phone: { contains: filters.query } }
          ]
        : undefined
    };

    const [rows, total] = await Promise.all([
      prisma.onlineOrder.findMany({
        where,
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.onlineOrder.count({ where })
    ]);

    return { rows, total };
  },

  async countByStatus(tenantId: string) {
    const groups = await prisma.onlineOrder.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true }
    });
    return Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Partial<
      Record<OnlineOrderStatus, number>
    >;
  },

  async byId(tenantId: string, id: string) {
    return prisma.onlineOrder.findFirst({
      where: { id, tenantId },
      include: { items: { include: { product: { select: { id: true, sku: true, quantity: true } } } }, customer: true }
    });
  },

  async create(payload: {
    tenantId: string;
    orderNumber: string;
    customerName: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
    total: number;
    items: Array<{ productId: string; productName: string; unitPrice: number; quantity: number; subtotal: number }>;
  }) {
    return prisma.onlineOrder.create({
      data: {
        tenantId: payload.tenantId,
        orderNumber: payload.orderNumber,
        customerName: payload.customerName,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        notes: payload.notes,
        total: payload.total,
        items: {
          create: payload.items.map((item) => ({ tenantId: payload.tenantId, ...item }))
        }
      }
    });
  }
};
