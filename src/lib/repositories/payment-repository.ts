import { prisma } from "@/lib/db/prisma";

export const paymentRepository = {
  async listRecent(tenantId: string, take = 10) {
    return prisma.payment.findMany({
      where: { tenantId },
      include: {
        order: true,
        customer: true,
        paymentMethod: true
      },
      orderBy: { paymentDate: "desc" },
      take
    });
  },

  async create(data: {
    tenantId: string;
    orderId: string;
    customerId: string;
    paymentMethodId: string;
    receivedById?: string;
    amount: number;
    referenceNo?: string;
    notes?: string;
  }) {
    return prisma.payment.create({
      data
    });
  }
};
