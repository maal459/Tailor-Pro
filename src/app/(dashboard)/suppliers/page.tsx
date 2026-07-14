import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { requirePermission } from "@/lib/auth/guards";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { formatCurrency } from "@/lib/utils";
import { createSupplierAction, deleteSupplierAction } from "@/app/(dashboard)/suppliers/actions";

const PAGE_SIZE = 10;

export default async function SuppliersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePermission("suppliers.manage");
  const params = await searchParams;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const { rows, total } = await supplierRepository.list(session.tenantId, q, page, PAGE_SIZE);
  const totals = await supplierRepository.totalsBySupplier(
    session.tenantId,
    rows.map((supplier) => supplier.id)
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-[var(--muted)]">Manage fabric and material suppliers</p>
        </div>
        <Link
          href="/purchases"
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
        >
          Purchases
        </Link>
      </div>

      {/* Add supplier */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Add Supplier</p>
        <form className="grid gap-3 md:grid-cols-3" action={createSupplierAction}>
          <Input name="supplierName" placeholder="Supplier name *" required />
          <Input name="phone" placeholder="Phone" />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="address" placeholder="Address" />
          <Input name="notes" placeholder="Notes" className="md:col-span-2" />
          <Button type="submit" className="md:w-fit">
            Add Supplier
          </Button>
        </form>
      </Card>

      {/* Search and list */}
      <Card>
        <form className="mb-4 flex gap-2" method="get">
          <Input name="q" placeholder="Search name, phone, or email" defaultValue={q} />
          <Button variant="secondary" type="submit">
            Search
          </Button>
        </form>

        <DataTable
          headers={["Name", "Phone", "Email", "Purchases", "Total Purchases", "Actions"]}
          emptyMessage="No suppliers found."
        >
          {rows.length
            ? rows.map((supplier) => (
                <tr key={supplier.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
                  <td className="px-4 py-3 font-medium">{supplier.supplierName}</td>
                  <td className="px-4 py-3">{supplier.phone ?? "—"}</td>
                  <td className="px-4 py-3">{supplier.email ?? "—"}</td>
                  <td className="px-4 py-3">{supplier._count.purchases}</td>
                  <td className="px-4 py-3 font-semibold">
                    {formatCurrency(totals.get(supplier.id) ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      >
                        History
                      </Link>
                      <Link
                        href={`/suppliers/${supplier.id}/edit`}
                        className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                      >
                        Edit
                      </Link>
                      <ActionButton
                        label="Delete"
                        confirmText={`Delete supplier "${supplier.supplierName}"?`}
                        action={deleteSupplierAction.bind(null, supplier.id)}
                        successMessage="Supplier deleted"
                        className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20"
                      />
                    </div>
                  </td>
                </tr>
              ))
            : null}
        </DataTable>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p>
            Page {page} of {pageCount} · {total} supplier{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <a
              className="rounded-lg border px-3 py-1"
              href={`/suppliers?page=${Math.max(1, page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              Prev
            </a>
            <a
              className="rounded-lg border px-3 py-1"
              href={`/suppliers?page=${Math.min(pageCount, page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            >
              Next
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
