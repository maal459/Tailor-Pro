"use client";

import { useMemo, useState, useTransition } from "react";
import { createOrderAction } from "@/app/(dashboard)/orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AsyncCombobox } from "@/components/ui/async-combobox";
import { useToast } from "@/components/ui/toaster";

type Option = { id: string; label: string };

type Props = {
  garmentTypes: Option[];
  profiles: Array<{ id: string; customerId: string; label: string }>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

export function OrderForm({ garmentTypes, profiles }: Props) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const [customerId, setCustomerId] = useState("");
  const [item, setItem] = useState({
    garmentTypeId: "",
    measurementProfileId: "",
    fabric: "",
    color: "",
    quantity: 1,
    unitPrice: 0,
    tailoringInstructions: ""
  });

  // Only show profiles that belong to the selected customer
  const customerProfiles = useMemo(
    () => profiles.filter((p) => p.customerId === customerId),
    [profiles, customerId]
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customerId) { toast.push("Please select a customer", "error"); return; }
    if (!item.garmentTypeId) { toast.push("Please select a garment type", "error"); return; }

    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createOrderAction({
          customerId,
          deliveryDate: String(form.get("deliveryDate") ?? ""),
          priority:      String(form.get("priority")      ?? "NORMAL"),
          status:        String(form.get("status")        ?? "PENDING"),
          discountAmount: Number(form.get("discountAmount") ?? 0),
          notes: String(form.get("notes") ?? ""),
          items: [{
            ...item,
            // send undefined instead of empty string to avoid FK violation
            measurementProfileId: item.measurementProfileId || undefined
          }]
        });
        toast.push("Order created successfully");
        // reset form
        setCustomerId("");
        setItem({ garmentTypeId: "", measurementProfileId: "", fabric: "", color: "", quantity: 1, unitPrice: 0, tailoringInstructions: "" });
        (event.target as HTMLFormElement).reset();
      } catch (error) {
        const text = error instanceof Error ? error.message : "Failed to create order";
        toast.push(text, "error");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* ─── Order details ─── */}
      <div>
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">Order Details</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer *">
            <AsyncCombobox
              endpoint="/api/search/customers"
              value={customerId}
              onSelect={(r) => { setCustomerId(r?.id ?? ""); setItem((prev) => ({ ...prev, measurementProfileId: "" })); }}
              placeholder="Search by phone or name…"
            />
          </Field>

          <Field label="Delivery Date">
            <Input name="deliveryDate" type="date" />
          </Field>

          <Field label="Priority">
            <Select name="priority" defaultValue="NORMAL">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>

          <Field label="Status">
            <Select name="status" defaultValue="PENDING">
              <option value="PENDING">Pending</option>
              <option value="CUTTING">Cutting</option>
              <option value="SEWING">Sewing</option>
              <option value="FINISHING">Finishing</option>
              <option value="READY">Ready</option>
            </Select>
          </Field>

          <Field label="Discount ($)">
            <Input name="discountAmount" type="number" step="0.01" min={0} placeholder="0.00" />
          </Field>

          <Field label="Order Notes">
            <Input name="notes" placeholder="Optional notes…" />
          </Field>
        </div>
      </div>

      {/* ─── Garment item ─── */}
      <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">Garment Item</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Garment Type *">
            <Select
              value={item.garmentTypeId}
              onChange={(e) => setItem((prev) => ({ ...prev, garmentTypeId: e.target.value }))}
              required
            >
              <option value="">Select garment type…</option>
              {garmentTypes.map((gt) => (
                <option key={gt.id} value={gt.id}>{gt.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Measurement Profile">
            <Select
              value={item.measurementProfileId}
              onChange={(e) => setItem((prev) => ({ ...prev, measurementProfileId: e.target.value }))}
            >
              <option value="">
                {!customerId
                  ? "Select a customer first"
                  : customerProfiles.length === 0
                  ? "No profiles for this customer"
                  : "Select profile (optional)"}
              </option>
              {customerProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Fabric">
            <Input
              placeholder="e.g. Wool Blend"
              value={item.fabric}
              onChange={(e) => setItem((prev) => ({ ...prev, fabric: e.target.value }))}
            />
          </Field>

          <Field label="Color">
            <Input
              placeholder="e.g. Navy"
              value={item.color}
              onChange={(e) => setItem((prev) => ({ ...prev, color: e.target.value }))}
            />
          </Field>

          <Field label="Quantity *">
            <Input
              type="number" min={1} placeholder="1"
              value={item.quantity}
              onChange={(e) => setItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
              required
            />
          </Field>

          <Field label="Unit Price ($) *">
            <Input
              type="number" min={0} step="0.01" placeholder="0.00"
              value={item.unitPrice || ""}
              onChange={(e) => setItem((prev) => ({ ...prev, unitPrice: Number(e.target.value) }))}
              required
            />
          </Field>

          <Field label="Tailoring Instructions">
            <Input
              className="lg:col-span-3"
              placeholder="Specific instructions for this garment…"
              value={item.tailoringInstructions}
              onChange={(e) => setItem((prev) => ({ ...prev, tailoringInstructions: e.target.value }))}
            />
          </Field>
        </div>
      </div>

      <Button disabled={isPending} type="submit" className="w-full sm:w-auto">
        {isPending ? "Creating…" : "Create Order"}
      </Button>
    </form>
  );
}
