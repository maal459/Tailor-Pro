import { prisma } from "@/lib/db/prisma";

export type ExpenseListFilters = {
  query?: string;
  categoryId?: string;
  from?: Date;
  to?: Date;
};

export const expenseRepository = {
  async list(tenantId: string, filters: ExpenseListFilters = {}, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      categoryId: filters.categoryId || undefined,
      expenseDate:
        filters.from || filters.to
          ? { gte: filters.from, lte: filters.to }
          : undefined,
      OR: filters.query
        ? [{ title: { contains: filters.query } }, { notes: { contains: filters.query } }]
        : undefined
    };

    const [rows, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true, paymentMethod: true, createdBy: true },
        orderBy: { expenseDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.expense.count({ where })
    ]);

    return { rows, total };
  },

  async byId(tenantId: string, id: string) {
    return prisma.expense.findFirst({
      where: { id, tenantId },
      include: { category: true, paymentMethod: true }
    });
  },

  async create(data: {
    tenantId: string;
    title: string;
    categoryId?: string;
    amount: number;
    expenseDate?: Date;
    paymentMethodId?: string;
    createdById?: string;
    notes?: string;
  }) {
    return prisma.expense.create({ data });
  },

  async update(
    tenantId: string,
    id: string,
    data: {
      title: string;
      categoryId?: string | null;
      amount: number;
      expenseDate?: Date;
      paymentMethodId?: string | null;
      notes?: string | null;
    }
  ) {
    return prisma.expense.updateMany({ where: { id, tenantId }, data });
  },

  async remove(tenantId: string, id: string) {
    return prisma.expense.deleteMany({ where: { id, tenantId } });
  },

  async listCategories(tenantId: string) {
    return prisma.expenseCategory.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    });
  },

  async createCategory(data: { tenantId: string; name: string; description?: string }) {
    return prisma.expenseCategory.create({ data });
  },

  async removeCategory(tenantId: string, id: string) {
    return prisma.expenseCategory.deleteMany({ where: { id, tenantId } });
  }
};
