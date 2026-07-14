import bcrypt from "bcryptjs";
import { PaymentMethodCode } from "@prisma/client";
import { prismaUnsafe } from "@/lib/db/prisma";
import { ALL_PERMISSIONS } from "@/lib/auth/permissions";

export type ProvisionTenantInput = {
  businessName: string;
  slug: string;
  ownerName?: string;
  ownerEmail: string;
  password: string;
  subscriptionPlan?: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
};

/**
 * Provisions a new business: the Tenant, its owner admin user, and sensible
 * defaults (payment methods + starter categories). Platform-level operation, so it
 * uses the unguarded client — but every tenant-scoped row it creates still carries
 * the new tenant's id. Shared by the platform UI and scripts/create-tenant.ts.
 */
export async function provisionTenant(input: ProvisionTenantInput) {
  const existingSlug = await prismaUnsafe.tenant.findUnique({ where: { slug: input.slug } });
  if (existingSlug) throw new Error(`A business with the slug "${input.slug}" already exists`);

  const existingEmail = await prismaUnsafe.user.findUnique({ where: { email: input.ownerEmail } });
  if (existingEmail) throw new Error(`A user with the email "${input.ownerEmail}" already exists`);

  const tenant = await prismaUnsafe.tenant.create({
    data: {
      businessName: input.businessName,
      slug: input.slug,
      ownerName: input.ownerName || null,
      email: input.ownerEmail,
      status: "ACTIVE",
      subscriptionPlan: input.subscriptionPlan ?? "FREE"
    }
  });

  const passwordHash = await bcrypt.hash(input.password, 10);
  const owner = await prismaUnsafe.user.create({
    data: {
      tenantId: tenant.id,
      fullName: input.ownerName || "Owner",
      email: input.ownerEmail,
      passwordHash,
      role: "admin",
      permissions: [...ALL_PERMISSIONS],
      isActive: true
    }
  });

  const methods: Array<{ code: PaymentMethodCode; label: string }> = [
    { code: PaymentMethodCode.CASH, label: "Cash" },
    { code: PaymentMethodCode.CARD, label: "Card" },
    { code: PaymentMethodCode.BANK_TRANSFER, label: "Bank Transfer" },
    { code: PaymentMethodCode.MOBILE_MONEY, label: "Mobile Money" }
  ];
  for (const method of methods) {
    await prismaUnsafe.paymentMethod.create({ data: { tenantId: tenant.id, ...method } });
  }
  for (const name of ["Suit", "Shirt", "Trouser", "Dress", "Custom Garment"]) {
    await prismaUnsafe.garmentType.create({ data: { tenantId: tenant.id, name } });
  }
  for (const name of ["Rent", "Utilities", "Miscellaneous"]) {
    await prismaUnsafe.expenseCategory.create({ data: { tenantId: tenant.id, name } });
  }
  for (const name of ["Fabric", "Accessories", "General"]) {
    await prismaUnsafe.productCategory.create({ data: { tenantId: tenant.id, name } });
  }

  return { tenant, owner };
}
