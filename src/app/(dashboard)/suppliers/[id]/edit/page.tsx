import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { updateSupplierAction } from "@/app/(dashboard)/suppliers/actions";
import { getT } from "@/lib/i18n/server";

export default async function EditSupplierPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("suppliers.manage");
  const t = await getT();
  const { id } = await params;

  const supplier = await supplierRepository.byId(session.tenantId, id);
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Edit Supplier")}</h1>
        <p className="text-sm text-[var(--muted)]">{supplier.supplierName}</p>
      </div>

      <Card>
        <form className="space-y-4" action={updateSupplierAction.bind(null, supplier.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Supplier Name *")}</label>
              <Input name="supplierName" defaultValue={supplier.supplierName} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Phone")}</label>
              <Input name="phone" defaultValue={supplier.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Email")}</label>
              <Input name="email" type="email" defaultValue={supplier.email ?? ""} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Address")}</label>
              <Input name="address" defaultValue={supplier.address ?? ""} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--muted)]">{t("Notes")}</label>
              <Input name="notes" defaultValue={supplier.notes ?? ""} placeholder={t("Optional notes…")} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">{t("Save Changes")}</Button>
            <Link
              href="/suppliers"
              className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
            >
              {t("Cancel")}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
