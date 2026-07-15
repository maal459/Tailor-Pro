import { prisma } from "@/lib/db/prisma";
import { getTenant } from "@/lib/tenant";
import {
  getPlanDefinition,
  getPlanLimit,
  type LimitedResource
} from "@/lib/billing/plans";

const RESOURCE_LABEL: Record<LimitedResource, string> = {
  users: "staff users",
  customers: "customers",
  products: "products"
};

async function countResource(tenantId: string, resource: LimitedResource): Promise<number> {
  switch (resource) {
    case "users":
      return prisma.user.count({ where: { tenantId } });
    case "customers":
      return prisma.customer.count({ where: { tenantId } });
    case "products":
      return prisma.product.count({ where: { tenantId } });
  }
}

/**
 * Throws a user-facing error when creating one more of `resource` would exceed the
 * tenant's plan cap. Call this at the top of the relevant create action. Unlimited
 * plans (limit === null) always pass. The thrown message is safe to show in a toast.
 */
export async function assertWithinPlanLimit(tenantId: string, resource: LimitedResource) {
  const tenant = await getTenant(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  const limit = getPlanLimit(tenant.subscriptionPlan, resource);
  if (limit === null) return; // unlimited

  const current = await countResource(tenantId, resource);
  if (current >= limit) {
    const planLabel = getPlanDefinition(tenant.subscriptionPlan).label;
    throw new Error(
      `Your ${planLabel} plan allows up to ${limit} ${RESOURCE_LABEL[resource]}. ` +
        `Upgrade your plan to add more.`
    );
  }
}
