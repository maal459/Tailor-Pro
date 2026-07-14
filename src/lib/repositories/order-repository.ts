import { prisma } from "@/lib/db/prisma";

export const orderRepository = {
  async list(tenantId: string, page = 1, pageSize = 10) {
    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId },
        include: {
          customer: true,
          items: { include: { garmentType: true } },
          payments: true
        },
        orderBy: { orderDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.order.count({ where: { tenantId } })
    ]);

    return { rows, total };
  },

  async create(payload: {
    tenantId: string;
    orderNumber: string;
    customerId: string;
    deliveryDate?: Date;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    status: "PENDING" | "CUTTING" | "SEWING" | "FINISHING" | "READY" | "DELIVERED" | "CANCELLED";
    discountAmount?: number;
    notes?: string;
    items: Array<{
      garmentTypeId: string;
      measurementProfileId?: string;
      fabric?: string;
      color?: string;
      quantity: number;
      unitPrice: number;
      tailoringInstructions?: string;
    }>;
  }) {
    return prisma.order.create({
      data: {
        tenantId: payload.tenantId,
        orderNumber: payload.orderNumber,
        customerId: payload.customerId,
        deliveryDate: payload.deliveryDate,
        priority: payload.priority,
        status: payload.status,
        discountAmount: payload.discountAmount ?? 0,
        notes: payload.notes,
        items: {
          create: payload.items.map((item) => ({
            tenantId: payload.tenantId,
            garmentTypeId: item.garmentTypeId,
            measurementProfileId: item.measurementProfileId,
            fabric: item.fabric,
            color: item.color,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            tailoringInstructions: item.tailoringInstructions
          }))
        }
      }
    });
  }
};
