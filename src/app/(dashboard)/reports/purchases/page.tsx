import { format } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PrintButton } from "@/components/ui/print-button";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getReportRange, parseReportPeriod } from "@/lib/report-range";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function PurchaseReportPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports.view");
  const params = await searchParams;
  const period = parseReportPeriod(params.period);
  const { from, to } = getReportRange(period, params.from, params.to);

  const purchases = await prisma.purchase.findMany({
    where: { tenantId: session.tenantId, purchaseDate: { gte: from, lte: to } },
    include: { supplier: true, items: true },
    orderBy: { purchaseDate: "desc" }
  });

  const totalAmount = purchases.reduce((sum, purchase) => sum + toNumber(purchase.total), 0);
  const totalUnits = purchases.reduce(
    (sum, purchase) => sum + purchase.items.reduce((s, item) => s + item.quantity, 0),
    0
  );

  const supplierTotals = new Map<string, number>();
  for (const purchase of purchases) {
    const name = purchase.supplier.supplierName;
    supplierTotals.set(name, (supplierTotals.get(name) ?? 0) + toNumber(purchase.total));
  }
  const bySupplier = [...supplierTotals.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Report</h1>
          <p className="text-sm text-[var(--muted)]">Supplier purchases by period</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href="/reports"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            ← Reports
          </Link>
          <PrintButton label="PDF" />
        </div>
      </div>

      <ReportFilterBar basePath="/reports/purchases" period={period} from={from} to={to} />

      <p className="text-sm text-[var(--muted)]">
        {format(from, "dd MMM yyyy")} – {format(to, "dd MMM yyyy")} · {purchases.length} purchase
        {purchases.length !== 1 ? "s" : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--muted)]">Total Purchase Cost</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Purchases</p>
          <p className="mt-2 text-2xl font-semibold">{purchases.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Units Received</p>
          <p className="mt-2 text-2xl font-semibold">{totalUnits}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Suppliers Used</p>
          <p className="mt-2 text-2xl font-semibold">{bySupplier.length}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">By Supplier</h2>
        <div className="space-y-2">
          {bySupplier.map(([name, amount]) => (
            <div key={name} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <span className="text-sm">{name}</span>
              <strong className="text-sm">{formatCurrency(amount)}</strong>
            </div>
          ))}
          {!bySupplier.length && (
            <p className="text-sm text-[var(--muted)]">No purchases in this period.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Purchase Details</h2>
        <DataTable
          headers={["Date", "Invoice", "Supplier", "Items", "Total"]}
          emptyMessage="No purchases in this period."
        >
          {purchases.length
            ? purchases.map((purchase) => (
                <tr key={purchase.id} className="border-t border-[var(--border)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                    {purchase.purchaseDate.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{purchase.invoiceNo ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{purchase.supplier.supplierName}</td>
                  <td className="px-4 py-3">
                    {purchase.items.reduce((sum, item) => sum + item.quantity, 0)} units
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(toNumber(purchase.total))}</td>
                </tr>
              ))
            : null}
        </DataTable>
      </Card>
    </div>
  );
}
