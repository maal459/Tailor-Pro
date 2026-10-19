import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/guards";
import { purchaseRepository } from "@/lib/repositories/purchase-repository";
import { formatCurrency, toNumber } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

export default async function PurchaseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("purchases.manage");
  const t = await getT();
  const { id } = await params;

  const purchase = await purchaseRepository.byId(session.tenantId, id);
  if (!purchase) notFound();

  const totalUnits = purchase.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{t("Purchase {invoice}", { invoice: purchase.invoiceNo ?? "" })}</h1>
          <p className="text-sm text-[var(--muted)]">
            {purchase.supplier.supplierName} · {purchase.purchaseDate.toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/purchases/${purchase.id}/edit`}
            className="rounded-xl bg-[var(--violet)]/10 px-4 py-2 text-sm font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
          >
            {t("Edit")}
          </Link>
          <Link
            href={`/suppliers/${purchase.supplierId}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            {t("Supplier History")}
          </Link>
          <Link
            href="/purchases"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            ← {t("Purchases")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Total Amount")}</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(toNumber(purchase.total))}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Products")}</p>
          <p className="mt-2 text-2xl font-semibold">{purchase.items.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">{t("Units Received")}</p>
          <p className="mt-2 text-2xl font-semibold">{totalUnits}</p>
        </Card>
      </div>

      {purchase.notes && (
        <Card>
          <p className="text-sm">
            <span className="text-[var(--muted)]">{t("Notes")}: </span>
            {purchase.notes}
          </p>
        </Card>
      )}

      <Card>
        <p className="mb-4 text-sm font-semibold">{t("Items")}</p>
        <DataTable headers={["Product", "SKU", "Quantity", "Unit Cost", "Subtotal"]}>
          {purchase.items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-3 font-medium">{item.product.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{item.product.sku}</td>
              <td className="px-4 py-3">
                {item.quantity}
                {item.product.unit ? ` ${item.product.unit}` : ""}
              </td>
              <td className="px-4 py-3">{formatCurrency(toNumber(item.unitCost))}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(toNumber(item.subtotal))}</td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-4 text-right text-sm">
          {t("Grand Total")}: <strong>{formatCurrency(toNumber(purchase.total))}</strong>
        </p>
      </Card>
    </div>
  );
}
