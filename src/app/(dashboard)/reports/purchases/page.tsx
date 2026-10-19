import { format } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { PrintButton } from "@/components/ui/print-button";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getReportRange, parseReportPeriod } from "@/lib/report-range";
import { getT } from "@/lib/i18n/server";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function PurchaseReportPage({
  searchParams
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports.view");
  const t = await getT();
  const params = await searchParams;
  const period = parseReportPeriod(params.period);
  const { from, to } = getReportRange(period, params.from, params.to);

  // Totals and the supplier breakdown aggregate in the DB over the full period;
  // the details table only shows the latest 20 rows.
  const where = { tenantId: session.tenantId, purchaseDate: { gte: from, lte: to } };
  const [purchases, totals, unitAgg, grouped, suppliers] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { purchaseDate: "desc" },
      take: 20
    }),
    prisma.purchase.aggregate({ where, _sum: { total: true }, _count: { _all: true } }),
    prisma.purchaseItem.aggregate({
      where: { tenantId: session.tenantId, purchase: { purchaseDate: { gte: from, lte: to } } },
      _sum: { quantity: true }
    }),
    prisma.purchase.groupBy({ by: ["supplierId"], where, _sum: { total: true } }),
    prisma.supplier.findMany({ where: { tenantId: session.tenantId }, select: { id: true, supplierName: true } })
  ]);

  const totalAmount = toNumber(totals._sum.total ?? 0);
  const purchaseCount = totals._count._all;
  const totalUnits = unitAgg._sum.quantity ?? 0;

  const supplierName = new Map(suppliers.map((s) => [s.id, s.supplierName]));
  const bySupplier = grouped
    .map((g) => [supplierName.get(g.supplierId) ?? t("Unknown"), toNumber(g._sum.total ?? 0)] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Purchase Report")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("Supplier purchases by period")}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link
            href="/reports"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            ← {t("Reports")}
          </Link>
          <PrintButton label="PDF" />
        </div>
      </div>

      <ReportFilterBar basePath="/reports/purchases" period={period} from={from} to={to} />

      <p className="text-sm text-[var(--muted)]">
        {format(from, "dd MMM yyyy")} – {format(to, "dd MMM yyyy")} ·{" "}
        {t(purchaseCount !== 1 ? "{count} purchases" : "{count} purchase", { count: purchaseCount })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Total Purchase Cost")}</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Purchases")}</p>
          <p className="mt-2 text-2xl font-semibold">{purchaseCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Units Received")}</p>
          <p className="mt-2 text-2xl font-semibold">{totalUnits}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Suppliers Used")}</p>
          <p className="mt-2 text-2xl font-semibold">{bySupplier.length}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("By Supplier")}</h2>
        <div className="space-y-2">
          {bySupplier.map(([name, amount]) => (
            <div key={name} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <span className="text-sm">{name}</span>
              <strong className="text-sm">{formatCurrency(amount)}</strong>
            </div>
          ))}
          {!bySupplier.length && (
            <p className="text-sm text-[var(--muted)]">{t("No purchases in this period.")}</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">{t("Purchase Details")}</h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          {t("Showing the 20 most recent — totals above cover the whole period.")}
        </p>
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
                    {t("{count} units", { count: purchase.items.reduce((sum, item) => sum + item.quantity, 0) })}
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
