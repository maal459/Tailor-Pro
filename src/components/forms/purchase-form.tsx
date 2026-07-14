"use client";

import { useState, useTransition } from "react";
import { createPurchaseAction } from "@/app/(dashboard)/purchases/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import { formatCurrency } from "@/lib/utils";

type Option = { id: string; label: string };
type ProductOption = { id: string; label: string; costPrice: number };

type ItemRow = { productId: string; quantity: number; unitCost: number };

const EMPTY_ITEM: ItemRow = { productId: "", quantity: 1, unitCost: 0 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

export function PurchaseForm({
  suppliers,
  products
}: {
  suppliers: Option[];
  products: ProductOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);

  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((option) => option.id === productId);
    updateItem(index, { productId, unitCost: product ? product.costPrice : 0 });
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierId) {
      toast.push("Please select a supplier", "error");
      return;
    }
    if (items.some((item) => !item.productId)) {
      toast.push("Please select a product for every item", "error");
      return;
    }

    startTransition(async () => {
      try {
        await createPurchaseAction({ supplierId, invoiceNo, purchaseDate, notes, items });
        toast.push("Purchase recorded and stock updated");
        setSupplierId("");
        setInvoiceNo("");
        setNotes("");
        setItems([{ ...EMPTY_ITEM }]);
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to record purchase", "error");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Purchase details */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Supplier *">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">Select supplier…</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Invoice No.">
          <Input
            placeholder="e.g. INV-1001"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />
        </Field>
        <Field label="Purchase Date">
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Input placeholder="Optional notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
        <p className="mb-3 text-sm font-semibold">Purchase Items</p>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label={index === 0 ? "Product *" : `Product ${index + 1} *`}>
                <Select
                  value={item.productId}
                  onChange={(e) => selectProduct(index, e.target.value)}
                  required
                >
                  <option value="">Select product…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantity *">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity || ""}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  required
                />
              </Field>
              <Field label="Unit Cost ($) *">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitCost || ""}
                  onChange={(e) => updateItem(index, { unitCost: Number(e.target.value) })}
                  required
                />
              </Field>
              <Field label="Subtotal">
                <div className="flex h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm font-semibold">
                  {formatCurrency(item.quantity * item.unitCost)}
                </div>
              </Field>
              <div>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
          >
            + Add Item
          </Button>
          <p className="text-sm">
            Grand Total: <strong>{formatCurrency(total)}</strong>
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving…" : "Save Purchase"}
      </Button>
    </form>
  );
}
