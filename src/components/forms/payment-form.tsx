"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaymentAction } from "@/app/(dashboard)/payments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AsyncCombobox } from "@/components/ui/async-combobox";
import { useToast } from "@/components/ui/toaster";

type Option = { id: string; label: string };

export function PaymentForm({
  paymentMethods
}: {
  paymentMethods: Option[];
}) {
  const router                          = useRouter();
  const [isPending, startTransition]    = useTransition();
  const [message, setMessage]           = useState<string | null>(null);
  const toast                           = useToast();
  const [orderId, setOrderId]           = useState("");
  const [customerId, setCustomerId]     = useState("");
  const [methodId, setMethodId]         = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createPaymentAction({
          orderId,
          customerId,
          paymentMethodId: methodId,
          amount:      Number(form.get("amount")      ?? 0),
          referenceNo: String(form.get("referenceNo") ?? ""),
          notes:       String(form.get("notes")       ?? "")
        });
        toast.push("Payment recorded — redirecting to receipt…");
        // redirect to the receipt for this order
        router.push(`/receipts?orderId=${orderId}`);
      } catch (error) {
        const text = error instanceof Error ? error.message : "Failed to record payment";
        setMessage(text);
        toast.push(text, "error");
      }
    });
  };

  return (
    <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
      <AsyncCombobox
        endpoint="/api/search/orders"
        value={orderId}
        onSelect={(r) => { setOrderId(r?.id ?? ""); setCustomerId((r?.customerId as string) ?? ""); }}
        placeholder="Search order by phone, name, or number…"
        className="md:col-span-2"
      />

      <SearchableSelect
        value={methodId}
        onChange={setMethodId}
        options={paymentMethods}
        placeholder="Payment method…"
      />

      <Input name="amount" type="number" min={0} step="0.01" placeholder="Amount ($)" required />
      <Input name="referenceNo" placeholder="Reference number" />
      <Input className="md:col-span-2" name="notes" placeholder="Notes" />

      <Button disabled={isPending} type="submit">
        {isPending ? "Saving…" : "Record Payment"}
      </Button>

      {message && <p className="text-sm text-red-600 md:col-span-4">{message}</p>}
    </form>
  );
}
