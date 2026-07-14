import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/guards";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function SupplierDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("suppliers.manage");
  const { id } = await params;

  const supplier = await supplierRepository.byId(session.tenantId, id);
  if (!supplier) notFound();

  const { purchases, totalAmount, purchaseCount } = await supplierRepository.purchaseHistory(
    session.tenantId,
    id
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{supplier.supplierName}</h1>
          <p className="text-sm text-[var(--muted)]">Supplier purchase history</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/suppliers/${supplier.id}/edit`}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Edit Supplier
          </Link>
          <Link
            href="/suppliers"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            ← Suppliers
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--muted)]">Total Purchases</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(toNumber(totalAmount))}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Purchase Count</p>
          <p className="mt-2 text-2xl font-semibold">{purchaseCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Phone</p>
          <p className="mt-2 text-lg font-semibold">{supplier.phone ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Email</p>
          <p className="mt-2 truncate text-lg font-semibold">{supplier.email ?? "—"}</p>
        </Card>
      </div>

      {(supplier.address || supplier.notes) && (
        <Card>
          {supplier.address && (
            <p className="text-sm">
              <span className="text-[var(--muted)]">Address: </span>
              {supplier.address}
            </p>
          )}
          {supplier.notes && (
            <p className="mt-1 text-sm">
              <span className="text-[var(--muted)]">Notes: </span>
              {supplier.notes}
            </p>
          )}
        </Card>
      )}

      <Card>
        <p className="mb-4 text-sm font-semibold">Purchases from this supplier</p>
        <DataTable
          headers={["Date", "Invoice", "Items", "Total", ""]}
          emptyMessage="No purchases recorded for this supplier."
        >
          {purchases.length
            ? purchases.map((purchase) => (
                <tr key={purchase.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {purchase.purchaseDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{purchase.invoiceNo ?? "—"}</td>
                  <td className="px-4 py-3">
                    {purchase.items
                      .map((item) => `${item.product.name} × ${item.quantity}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(toNumber(purchase.total))}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/purchases/${purchase.id}`}
                      className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            : null}
        </DataTable>
      </Card>
    </div>
  );
}
