"use client";

import { useEffect, useState, useTransition } from "react";
import { createOrderAction } from "@/app/(dashboard)/orders/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AsyncCombobox } from "@/components/ui/async-combobox";
import { useToast } from "@/components/ui/toaster";
import { useT } from "@/lib/i18n/client";

type Option = { id: string; label: string };

type Props = {
  garmentTypes: Option[];
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

export function OrderForm({ garmentTypes }: Props) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const t = useT();

  const [customerId, setCustomerId] = useState("");
  const [customerProfiles, setCustomerProfiles] = useState<Option[]>([]);
  const [item, setItem] = useState({
    garmentTypeId: "",
    measurementProfileId: "",
    fabric: "",
    color: "",
    quantity: 1,
    unitPrice: 0,
    tailoringInstructions: ""
  });

  // Fetch the selected customer's profiles on demand instead of shipping every
  // profile in the tenant to the browser.
  useEffect(() => {
    if (!customerId) { setCustomerProfiles([]); return; }
    let cancelled = false;
    fetch(`/api/search/profiles?customerId=${encodeURIComponent(customerId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Option[]) => { if (!cancelled) setCustomerProfiles(data); })
      .catch(() => { if (!cancelled) setCustomerProfiles([]); });
    return () => { cancelled = true; };
  }, [customerId]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customerId) { toast.push(t("Please select a customer"), "error"); return; }
    if (!item.garmentTypeId) { toast.push(t("Please select a garment type"), "error"); return; }

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
        toast.push(t("Order created successfully"));
        // reset form
        setCustomerId("");
        setItem({ garmentTypeId: "", measurementProfileId: "", fabric: "", color: "", quantity: 1, unitPrice: 0, tailoringInstructions: "" });
        (event.target as HTMLFormElement).reset();
      } catch (error) {
        const text = error instanceof Error ? error.message : t("Failed to create order");
        toast.push(text, "error");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* ─── Order details ─── */}
      <div>
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">{t("Order Details")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={`${t("Customer")} *`}>
            <AsyncCombobox
              endpoint="/api/search/customers"
              value={customerId}
              onSelect={(r) => { setCustomerId(r?.id ?? ""); setItem((prev) => ({ ...prev, measurementProfileId: "" })); }}
              placeholder={t("Search by phone or name…")}
            />
          </Field>

          <Field label={t("Delivery date")}>
            <Input name="deliveryDate" type="date" />
          </Field>

          <Field label={t("Priority")}>
            <Select name="priority" defaultValue="NORMAL">
              <option value="LOW">{t("LOW")}</option>
              <option value="NORMAL">{t("NORMAL")}</option>
              <option value="HIGH">{t("HIGH")}</option>
              <option value="URGENT">{t("URGENT")}</option>
            </Select>
          </Field>

          <Field label={t("Status")}>
            <Select name="status" defaultValue="PENDING">
              <option value="PENDING">{t("PENDING")}</option>
              <option value="CUTTING">{t("CUTTING")}</option>
              <option value="SEWING">{t("SEWING")}</option>
              <option value="FINISHING">{t("FINISHING")}</option>
              <option value="READY">{t("READY")}</option>
            </Select>
          </Field>

          <Field label={t("Discount ($)")}>
            <Input name="discountAmount" type="number" step="0.01" min={0} placeholder="0.00" />
          </Field>

          <Field label={t("Order Notes")}>
            <Input name="notes" placeholder={t("Optional notes…")} />
          </Field>
        </div>
      </div>

      {/* ─── Garment item ─── */}
      <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">{t("Garment Item")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={`${t("Garment type")} *`}>
            <Select
              value={item.garmentTypeId}
              onChange={(e) => setItem((prev) => ({ ...prev, garmentTypeId: e.target.value }))}
              required
            >
              <option value="">{t("Select garment type…")}</option>
              {garmentTypes.map((gt) => (
                <option key={gt.id} value={gt.id}>{gt.label}</option>
              ))}
            </Select>
          </Field>

          <Field label={t("Measurement Profile")}>
            <Select
              value={item.measurementProfileId}
              onChange={(e) => setItem((prev) => ({ ...prev, measurementProfileId: e.target.value }))}
            >
              <option value="">
                {!customerId
                  ? t("Select a customer first")
                  : customerProfiles.length === 0
                  ? t("No profiles for this customer")
                  : t("Select profile (optional)")}
              </option>
              {customerProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </Select>
          </Field>

          <Field label={t("Fabric")}>
            <Input
              placeholder={t("e.g. Wool Blend")}
              value={item.fabric}
              onChange={(e) => setItem((prev) => ({ ...prev, fabric: e.target.value }))}
            />
          </Field>

          <Field label={t("Color")}>
            <Input
              placeholder={t("e.g. Navy")}
              value={item.color}
              onChange={(e) => setItem((prev) => ({ ...prev, color: e.target.value }))}
            />
          </Field>

          <Field label={`${t("Quantity")} *`}>
            <Input
              type="number" min={1} placeholder="1"
              value={item.quantity}
              onChange={(e) => setItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
              required
            />
          </Field>

          <Field label={`${t("Unit Price ($)")} *`}>
            <Input
              type="number" min={0} step="0.01" placeholder="0.00"
              value={item.unitPrice || ""}
              onChange={(e) => setItem((prev) => ({ ...prev, unitPrice: Number(e.target.value) }))}
              required
            />
          </Field>

          <Field label={t("Tailoring Instructions")}>
            <Input
              className="lg:col-span-3"
              placeholder={t("Specific instructions for this garment…")}
              value={item.tailoringInstructions}
              onChange={(e) => setItem((prev) => ({ ...prev, tailoringInstructions: e.target.value }))}
            />
          </Field>
        </div>
      </div>

      <Button disabled={isPending} type="submit" className="w-full sm:w-auto">
        {isPending ? t("Creating…") : t("Create Order")}
      </Button>
    </form>
  );
}
