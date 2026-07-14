import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/ui/print-button";
import { requirePermission } from "@/lib/auth/guards";
import { financeService } from "@/lib/services/finance-service";
import { formatCurrency } from "@/lib/utils";

export default async function StockReportPage() {
  const session = await requirePermission("reports.view");

  const products = await financeService.stockSummary(session.tenantId);

  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const stockCostValue = products.reduce(
    (sum, product) => sum + product.quantity * product.costPrice,
    0
  );
  const stockRetailValue = products.reduce(
    (sum, product) => sum + product.quantity * product.sellingPrice,
    0
  );
  const lowStock = products.filter((product) => product.lowStock);
  const outOfStock = products.filter((product) => product.outOfStock);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stock Report</h1>
          <p className="text-sm text-[var(--muted)]">Current inventory snapshot</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href="/reports"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            ← Reports
          </Link>
          <Link
            href="/products"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Manage Products
          </Link>
          <PrintButton label="PDF" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-sm text-[var(--muted)]">Products</p>
          <p className="mt-2 text-2xl font-semibold">{products.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Units in Stock</p>
          <p className="mt-2 text-2xl font-semibold">{totalUnits}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Stock Value (Cost)</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(stockCostValue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Low Stock</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{lowStock.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Out of Stock</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{outOfStock.length}</p>
        </Card>
      </div>

      <Card>
        <p className="text-sm text-[var(--muted)]">
          Potential retail value of current stock:{" "}
          <strong className="text-[var(--text)]">{formatCurrency(stockRetailValue)}</strong>
        </p>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Inventory</h2>
        <DataTable
          headers={["Product", "SKU", "Category", "Supplier", "Qty", "Min", "Cost Value", "Status"]}
          emptyMessage="No products yet."
        >
          {products.length
            ? products.map((product) => (
                <tr key={product.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">{product.supplier}</td>
                  <td className="px-4 py-3 font-semibold">{product.quantity}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{product.minimumStock}</td>
                  <td className="px-4 py-3">{formatCurrency(product.quantity * product.costPrice)}</td>
                  <td className="px-4 py-3">
                    {product.outOfStock ? (
                      <Badge label="Out of Stock" tone="danger" />
                    ) : product.lowStock ? (
                      <Badge label="Low Stock" tone="warn" />
                    ) : (
                      <Badge label="In Stock" tone="success" />
                    )}
                  </td>
                </tr>
              ))
            : null}
        </DataTable>
      </Card>
    </div>
  );
}
