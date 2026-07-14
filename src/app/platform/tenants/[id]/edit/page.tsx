import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { TenantForm } from "@/components/forms/tenant-form";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";

export default async function EditTenantPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const tenant = await prismaUnsafe.tenant.findUnique({
    where: { id },
    include: { _count: { select: { users: true, customers: true, orders: true } } }
  });
  if (!tenant) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{tenant.businessName}</h1>
        <p className="text-sm text-[var(--muted)]">
          {tenant.slug} · {tenant._count.users} users · {tenant._count.customers} customers ·{" "}
          {tenant._count.orders} orders
        </p>
      </div>

      <Card>
        <TenantForm
          mode="edit"
          tenantId={tenant.id}
          initial={{
            businessName: tenant.businessName,
            ownerName: tenant.ownerName ?? "",
            email: tenant.email ?? "",
            phone: tenant.phone ?? "",
            address: tenant.address ?? "",
            subscriptionPlan: tenant.subscriptionPlan,
            status: tenant.status
          }}
        />
      </Card>

      <Link
        href="/platform/tenants"
        className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
      >
        ← All tenants
      </Link>
    </div>
  );
}
