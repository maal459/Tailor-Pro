import { prisma } from "@/lib/db/prisma";

export type SalaryListFilters = {
  employeeId?: string;
  month?: number;
  year?: number;
};

export const salaryRepository = {
  async list(tenantId: string, filters: SalaryListFilters = {}, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      employeeId: filters.employeeId || undefined,
      month: filters.month || undefined,
      year: filters.year || undefined
    };

    const [rows, total] = await Promise.all([
      prisma.salary.findMany({
        where,
        include: { employee: true },
        orderBy: { paymentDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.salary.count({ where })
    ]);

    return { rows, total };
  },

  async byId(tenantId: string, id: string) {
    return prisma.salary.findFirst({
      where: { id, tenantId },
      include: { employee: true }
    });
  },

  async create(data: {
    tenantId: string;
    employeeId: string;
    amount: number;
    paymentDate: Date;
    month: number;
    year: number;
    notes?: string;
  }) {
    return prisma.salary.create({ data });
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      amount: number;
      paymentDate: Date;
      month: number;
      year: number;
      notes?: string | null;
    }
  ) {
    return prisma.salary.updateMany({ where: { id, tenantId }, data });
  },

  async remove(tenantId: string, id: string) {
    return prisma.salary.deleteMany({ where: { id, tenantId } });
  }
};
