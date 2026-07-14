import { prisma } from "@/lib/db/prisma";

export type UserRow = {
  id: string;
  tenantId: string | null;
  fullName: string;
  email: string;
  role: string;
  permissions: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const userRepository = {
  async list(tenantId: string, query?: string, page = 1, pageSize = 10) {
    const where = {
      tenantId,
      OR: query
        ? [
            { fullName: { contains: query } },
            { email: { contains: query } },
            { role: { contains: query } }
          ]
        : undefined
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          fullName: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.user.count({ where })
    ]);

    return { rows: rows as UserRow[], total };
  },

  async detail(id: string, tenantId: string) {
    return prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        fullName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    }) as Promise<UserRow | null>;
  }
};
