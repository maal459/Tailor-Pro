import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/guards";
import { purchaseRepository } from "@/lib/repositories/purchase-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { formatCurrency, toNumber } from "@/lib/utils";
import { updatePurchaseAction } from "@/app/(dashboard)/purchases/actions";

export default async function EditPurchasePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("purchases.manage");
  const { id } = await params;

  const [purchase, suppliers] = await Promise.all([
    purchaseRepository.byId(session.tenantId, id),
    supplierRepository.listAll(session.tenantId)
  ]);
  if (!purchase) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Purchase</h1>
        <p className="text-sm text-[var(--muted)]">{formatCurrency(toNumber(purchase.total))} · {purchase.items.length} items</p>
      </div>

      <Card>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Editing purchase details. Item quantities/stock aren&apos;t changed here — delete and
          re-record the purchase to adjust items.
        </p>
        <form action={updatePurchaseAction.bind(null, id)} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Supplier *</span>
            <Select name="supplierId" defaultValue={purchase.supplierId}>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Invoice no.</span>
            <Input name="invoiceNo" defaultValue={purchase.invoiceNo ?? ""} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Purchase date</span>
            <Input type="date" name="purchaseDate" defaultValue={format(purchase.purchaseDate, "yyyy-MM-dd")} />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Notes</span>
            <Input name="notes" defaultValue={purchase.notes ?? ""} />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">Save Changes</Button>
            <Link href={`/purchases/${id}`} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5">Cancel</Link>
          </div>
        </form>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold">Items (read-only)</p>
        <DataTable headers={["Product", "Qty", "Unit cost", "Subtotal"]}>
          {purchase.items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-3">{item.product.name}</td>
              <td className="px-4 py-3">{item.quantity}</td>
              <td className="px-4 py-3">{formatCurrency(toNumber(item.unitCost))}</td>
              <td className="px-4 py-3">{formatCurrency(toNumber(item.subtotal))}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
