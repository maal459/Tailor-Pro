import { prisma } from "@/lib/db/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type ActivityInput = {
  tenantId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  message?: string;
};

/**
 * Records a CRUD operation in the existing ActivityLog table.
 * Pass a transaction client to make the log atomic with the operation;
 * otherwise failures are swallowed so logging never breaks the main flow.
 */
export async function logActivity(input: ActivityInput, client?: DbClient) {
  const data = {
    tenantId: input.tenantId,
    actorUserId: input.actorUserId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    message: input.message ?? null
  };

  if (client) {
    await client.activityLog.create({ data });
    return;
  }

  try {
    await prisma.activityLog.create({ data });
  } catch (error) {
    console.error("Failed to write activity log", error);
  }
}
