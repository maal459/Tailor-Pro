"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentAction } from "@/app/(dashboard)/payments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toaster";

type Option = { id: string; label: string };

type Props = {
  paymentId:     string;
  orderId:       string;
  orderLabel:    string;
  defaultAmount: number;
  defaultMethod: string;
  defaultRef:    string;
  defaultNotes:  string;
  paymentMethods: Option[];
};

export function EditPaymentForm({
  paymentId,
  orderLabel,
  defaultAmount,
  defaultMethod,
  defaultRef,
  defaultNotes,
  paymentMethods
}: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const toast                        = useToast();
  const [methodId, setMethodId]      = useState(defaultMethod);
  const [amount,   setAmount]        = useState(defaultAmount);
  const [ref,      setRef]           = useState(defaultRef);
  const [notes,    setNotes]         = useState(defaultNotes);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updatePaymentAction(paymentId, {
          paymentMethodId: methodId,
          amount,
          referenceNo: ref,
          notes
        });
        toast.push("Payment updated");
        router.push("/payments");
        router.refresh();
      } catch (err) {
        toast.push(err instanceof Error ? err.message : "Update failed", "error");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-sm">
        <span className="text-[var(--muted)]">Order: </span>
        <span className="font-medium">{orderLabel}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Payment Method</label>
          <SearchableSelect
            value={methodId}
            onChange={setMethodId}
            options={paymentMethods}
            placeholder="Select method…"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Amount ($)</label>
          <Input
            type="number" min={0.01} step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Reference Number</label>
          <Input
            placeholder="e.g. TXN-001"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Notes</label>
          <Input
            placeholder="Optional notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
