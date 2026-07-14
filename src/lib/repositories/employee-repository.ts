import { prisma } from "@/lib/db/prisma";

export const employeeRepository = {
  async list(tenantId: string, query?: string, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      OR: query
        ? [
            { fullName: { contains: query } },
            { phone: { contains: query } },
            { position: { contains: query } }
          ]
        : undefined
    };

    const [rows, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: { _count: { select: { salaries: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.employee.count({ where })
    ]);

    return { rows, total };
  },

  async listActive(tenantId: string) {
    return prisma.employee.findMany({
      where: { tenantId, isActive: true },
      orderBy: { fullName: "asc" }
    });
  },

  async byId(tenantId: string, id: string) {
    return prisma.employee.findFirst({ where: { id, tenantId } });
  },

  async create(data: {
    tenantId: string;
    fullName: string;
    phone?: string;
    position?: string;
    monthlySalary: number;
    isActive?: boolean;
  }) {
    return prisma.employee.create({ data });
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      fullName: string;
      phone?: string | null;
      position?: string | null;
      monthlySalary: number;
      isActive?: boolean;
    }
  ) {
    return prisma.employee.updateMany({ where: { id, tenantId }, data });
  },

  async remove(tenantId: string, id: string) {
    return prisma.employee.deleteMany({ where: { id, tenantId } });
  }
};
