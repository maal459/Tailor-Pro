import Link from "next/link";
import { Building2, CheckCircle2, PauseCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { StatCard } from "@/components/platform/stat-card";
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

  const activeCount = tenants.filter((t) => t.status === "ACTIVE").length;
  const suspendedCount = tenants.filter((t) => t.status !== "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#1A1D2E] to-[#2A2F45] p-6 text-white">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-white/70">
          {tenants.length} business{tenants.length !== 1 ? "es" : ""} on this deployment
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total businesses" value={String(tenants.length)} icon={Building2} tone="violet" />
        <StatCard label="Active" value={String(activeCount)} icon={CheckCircle2} tone="green" />
        <StatCard label="Suspended / cancelled" value={String(suspendedCount)} icon={PauseCircle} tone={suspendedCount > 0 ? "amber" : "default"} />
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
