import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { TenantForm } from "@/components/forms/tenant-form";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { setTenantStatusAction } from "@/app/platform/tenants/actions";

const statusTone: Record<string, "success" | "warn" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "warn",
  CANCELLED: "danger"
};

export default async function PlatformTenantsPage() {
  await requireSuperAdmin();

  const tenants = await prismaUnsafe.tenant.findMany({
    include: { _count: { select: { users: true, customers: true, orders: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-[var(--muted)]">
          {tenants.length} business{tenants.length !== 1 ? "es" : ""} on this deployment
        </p>
      </div>

      <Card>
        <p className="mb-4 text-sm font-semibold">Onboard New Business</p>
        <TenantForm mode="create" />
      </Card>

      <Card>
        <DataTable
          headers={["Business", "Slug", "Plan", "Status", "Users", "Customers", "Orders", "Created", "Actions"]}
          emptyMessage="No tenants yet."
        >
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
              <td className="px-4 py-3 font-medium">{tenant.businessName}</td>
              <td className="px-4 py-3 font-mono text-xs">{tenant.slug}</td>
              <td className="px-4 py-3">{tenant.subscriptionPlan}</td>
              <td className="px-4 py-3">
                <Badge label={tenant.status} tone={statusTone[tenant.status] ?? "neutral"} />
              </td>
              <td className="px-4 py-3">{tenant._count.users}</td>
              <td className="px-4 py-3">{tenant._count.customers}</td>
              <td className="px-4 py-3">{tenant._count.orders}</td>
              <td className="px-4 py-3 text-[var(--muted)]">{tenant.createdAt.toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/platform/tenants/${tenant.id}/edit`}
                    className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                  >
                    Edit
                  </Link>
                  {tenant.status === "ACTIVE" ? (
                    <ActionButton
                      label="Suspend"
                      confirmText={`Suspend "${tenant.businessName}"? Its users will be locked out immediately.`}
                      action={setTenantStatusAction.bind(null, tenant.id, "SUSPENDED")}
                      successMessage="Tenant suspended"
                      className="rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/20"
                    />
                  ) : (
                    <ActionButton
                      label="Reactivate"
                      confirmText={`Reactivate "${tenant.businessName}"?`}
                      action={setTenantStatusAction.bind(null, tenant.id, "ACTIVE")}
                      successMessage="Tenant reactivated"
                      className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20"
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
