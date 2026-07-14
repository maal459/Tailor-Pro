import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { requirePermission } from "@/lib/auth/guards";
import { purchaseRepository } from "@/lib/repositories/purchase-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { formatCurrency, toNumber } from "@/lib/utils";
import { deletePurchaseAction } from "@/app/(dashboard)/purchases/actions";

const PAGE_SIZE = 10;

export default async function PurchasesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await requirePermission("purchases.manage");
  const params = await searchParams;
  const q = params.q?.trim();
  const from = params.from?.trim();
  const to = params.to?.trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const [{ rows, total }, suppliers, products] = await Promise.all([
    purchaseRepository.list(
      session.tenantId,
      {
        query: q,
        from: from ? new Date(`${from}T00:00:00`) : undefined,
        to: to ? new Date(`${to}T23:59:59.999`) : undefined
      },
      page,
      PAGE_SIZE
    ),
    supplierRepository.listAll(session.tenantId),
    productRepository.listAll(session.tenantId)
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    sp.set("page", String(target));
    return `/purchases?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-sm text-[var(--muted)]">
            Record supplier purchases — stock levels update automatically
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/suppliers"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Suppliers
          </Link>
          <Link
            href="/reports/purchases"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Purchase Report
          </Link>
        </div>
      </div>

      {/* New purchase */}
      <Card>
        <p className="mb-4 text-sm font-semibold">New Purchase</p>
        {suppliers.length && products.length ? (
          <PurchaseForm
            suppliers={suppliers.map((supplier) => ({
              id: supplier.id,
              label: supplier.supplierName
            }))}
            products={products.map((product) => ({
              id: product.id,
              label: `${product.name} (${product.sku})`,
              costPrice: toNumber(product.costPrice)
            }))}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">
            You need at least one{" "}
            <Link href="/suppliers" className="text-[var(--primary)] underline">
              supplier
            </Link>{" "}
            and one{" "}
            <Link href="/products" className="text-[var(--primary)] underline">
              product
            </Link>{" "}
            before recording purchases.
          </p>
        )}
      </Card>

      {/* Search, filters, and list */}
      <Card>
        <form className="mb-4 grid gap-3 md:grid-cols-4" method="get">
          <Input name="q" placeholder="Search invoice or supplier" defaultValue={q} />
          <Input name="from" type="date" defaultValue={from} />
          <Input name="to" type="date" defaultValue={to} />
          <div className="flex gap-2">
            <Button variant="secondary" type="submit">
              Filter
            </Button>
            {(q || from || to) && (
              <Link
                href="/purchases"
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
              >
                Clear
              </Link>
            )}
          </div>
        </form>

        <DataTable
          headers={["Date", "Invoice", "Supplier", "Items", "Total", "Actions"]}
          emptyMessage="No purchases found."
        >
          {rows.length
            ? rows.map((purchase) => (
                <tr key={purchase.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {purchase.purchaseDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{purchase.invoiceNo ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{purchase.supplier.supplierName}</td>
                  <td className="px-4 py-3">
                    {purchase.items.reduce((sum, item) => sum + item.quantity, 0)} unit
                    {purchase.items.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? "s" : ""} ·{" "}
                    {purchase.items.length} product{purchase.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(toNumber(purchase.total))}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/purchases/${purchase.id}`}
                        className="rounded-lg bg-[var(--primary)]/10 px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      >
                        View
                      </Link>
                      <ActionButton
                        label="Delete"
                        confirmText="Delete this purchase? Stock added by it will be removed again."
                        action={deletePurchaseAction.bind(null, purchase.id)}
                        successMessage="Purchase deleted and stock reversed"
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
            Page {page} of {pageCount} · {total} purchase{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <a className="rounded-lg border px-3 py-1" href={pageHref(Math.max(1, page - 1))}>
              Prev
            </a>
            <a className="rounded-lg border px-3 py-1" href={pageHref(Math.min(pageCount, page + 1))}>
              Next
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
