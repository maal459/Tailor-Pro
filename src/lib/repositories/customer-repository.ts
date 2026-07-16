import { prisma } from "@/lib/db/prisma";

export const customerRepository = {
  async list(tenantId: string, query?: string, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      OR: query
        ? [
            { fullName: { contains: query } },
            { phone: { contains: query } },
            { customerNumber: { contains: query } }
          ]
        : undefined
    };

    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          orders: {
            include: {
              items: true
            }
          },
          payments: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.customer.count({ where })
    ]);

    return { rows, total };
  },

  async create(data: {
    tenantId: string;
    customerNumber: string;
    fullName: string;
    phone: string;
    alternativePhone?: string;
    email?: string;
    address?: string;
    city?: string;
    notes?: string;
  }) {
    return prisma.customer.create({ data });
  },

  async byId(tenantId: string, id: string) {
    return prisma.customer.findFirst({ where: { id, tenantId } });
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      fullName: string;
      phone: string;
      alternativePhone?: string | null;
      email?: string | null;
      address?: string | null;
      city?: string | null;
      notes?: string | null;
    }
  ) {
    return prisma.customer.updateMany({ where: { id, tenantId }, data });
  },

  async remove(tenantId: string, id: string) {
    return prisma.customer.deleteMany({ where: { id, tenantId } });
  }
};
