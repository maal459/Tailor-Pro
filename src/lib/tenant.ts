import { prismaUnsafe } from "@/lib/db/prisma";

export type TenantRecord = Awaited<ReturnType<typeof getTenant>>;

/** Platform-level lookup of a tenant by id. Not tenant-scoped by nature. */
export async function getTenant(tenantId: string) {
  return prismaUnsafe.tenant.findUnique({ where: { id: tenantId } });
}

/** A tenant may use the app only while ACTIVE (not SUSPENDED / CANCELLED). */
export async function isTenantActive(tenantId: string): Promise<boolean> {
  const tenant = await getTenant(tenantId);
  return tenant?.status === "ACTIVE";
}

/**
 * Builds a where-fragment that always pins a query to one tenant. Callers spread
 * their own filters on top: `where: { ...tenantScope(tenantId), status: "READY" }`.
 * The Prisma guard enforces that this (or an equivalent tenantId filter) is present.
 */
export function tenantScope(tenantId: string) {
  return { tenantId };
}
