/**
 * Provision a new tenant (business) with an owner admin user and sensible defaults.
 *
 * Usage:
 *   npx tsx scripts/create-tenant.ts "<Business Name>" <slug> <owner-email> <password> [ownerName]
 *
 * Example:
 *   npx tsx scripts/create-tenant.ts "Style Tailors" style-tailors owner@style.local secret123 "Aisha"
 *
 * Shares the same provisioning logic as the platform admin UI.
 */
import { prismaUnsafe } from "@/lib/db/prisma";
import { provisionTenant } from "@/lib/tenant-provisioning";

const [, , businessName, slug, ownerEmail, password, ownerName] = process.argv;

if (!businessName || !slug || !ownerEmail || !password) {
  console.error(
    'Usage: npx tsx scripts/create-tenant.ts "<Business Name>" <slug> <owner-email> <password> [ownerName]'
  );
  process.exit(1);
}

provisionTenant({ businessName, slug, ownerEmail, password, ownerName })
  .then(({ tenant, owner }) => {
    console.log("✓ Tenant provisioned");
    console.log(`  id:        ${tenant.id}`);
    console.log(`  business:  ${tenant.businessName} (${tenant.slug})`);
    console.log(`  owner:     ${owner.email}`);
  })
  .catch((error) => {
    console.error("✗", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaUnsafe.$disconnect();
  });
