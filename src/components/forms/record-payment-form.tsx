"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import { recordPaymentAction } from "@/app/platform/finance/actions";

const METHODS = ["CASH", "ZAAD", "EDAHAB", "BANK_TRANSFER", "CARD", "MANUAL", "OTHER"] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

/**
 * "Record payment" button + modal for an open subscription invoice. Records the payment
 * (cash/ZAAD/eDahab/bank/…), which marks the invoice paid, advances the tenant's
 * paid-through date, and reactivates a tenant that had been suspended for non-payment.
 */
export function RecordPaymentForm({
  invoiceId,
  defaultAmount,
  currency,
  businessName
}: {
  invoiceId: string;
  defaultAmount: number;
  currency: string;
  businessName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState({
    amount: String(defaultAmount),
    method: "CASH",
    gatewayRef: "",
    notes: ""
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        await recordPaymentAction({
          invoiceId,
          amount: Number(values.amount),
          method: values.method,
          gatewayRef: values.gatewayRef,
          notes: values.notes
        });
        toast.push("Payment recorded");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to record payment", "error");
      }
    });
  };

  const needsRef = values.method === "ZAAD" || values.method === "EDAHAB" || values.method === "BANK_TRANSFER";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20"
      >
        Record payment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Record subscription payment</h2>
            <p className="mb-4 text-sm text-[var(--muted)]">{businessName}</p>
            <form onSubmit={submit} className="grid gap-3">
              <Field label={`Amount (${currency})`}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={values.amount}
                  onChange={(e) => setValues((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Method">
                <Select
                  value={values.method}
                  onChange={(e) => setValues((p) => ({ ...p, method: e.target.value }))}
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={needsRef ? "Transaction reference *" : "Transaction reference (optional)"}>
                <Input
                  value={values.gatewayRef}
                  onChange={(e) => setValues((p) => ({ ...p, gatewayRef: e.target.value }))}
                  placeholder={needsRef ? "e.g. ZAAD txn id" : ""}
                  required={needsRef}
                />
              </Field>
              <Field label="Notes (optional)">
                <Input
                  value={values.notes}
                  onChange={(e) => setValues((p) => ({ ...p, notes: e.target.value }))}
                />
              </Field>
              <div className="mt-2 flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Confirm payment"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
