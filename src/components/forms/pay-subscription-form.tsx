"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import { payInvoiceAction } from "@/app/billing/actions";
import type { InitiateResult } from "@/lib/billing/charges";

const LABEL: Record<string, string> = { ZAAD: "ZAAD", EDAHAB: "eDahab" };

/**
 * Tenant self-service "Pay with ZAAD/eDahab" form. Handles the async nature of mobile
 * money: PAID settles immediately, PENDING asks the user to approve the USSD push on
 * their phone (the webhook settles it), FAILED shows the reason.
 */
export function PaySubscriptionForm({
  invoiceId,
  amountLabel,
  defaultPayer,
  availableProviders
}: {
  invoiceId: string;
  amountLabel: string;
  defaultPayer: string;
  availableProviders: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, start] = useTransition();
  const [provider, setProvider] = useState(availableProviders[0] ?? "ZAAD");
  const [payer, setPayer] = useState(defaultPayer);
  const [result, setResult] = useState<InitiateResult | null>(null);

  if (availableProviders.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Online payment isn&apos;t enabled yet. Please pay using the details on your invoice or contact
        support, and it will be recorded for you.
      </div>
    );
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    start(async () => {
      const r = await payInvoiceAction({ invoiceId, provider, payerRef: payer });
      setResult(r);
      if (r.status === "PAID") {
        toast.push("Payment successful — thank you!");
        router.refresh();
      } else if (r.status === "PENDING") {
        toast.push("Approve the request on your phone");
      } else {
        toast.push(r.message, "error");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Pay with</label>
          <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
            {availableProviders.map((p) => (
              <option key={p} value={p}>
                {LABEL[p] ?? p}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted)]">Wallet / phone number</label>
          <Input
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            placeholder="e.g. 63xxxxxxx"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Requesting…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Pay {amountLabel} with {LABEL[provider] ?? provider}
          </span>
        )}
      </Button>

      {result && result.status === "PENDING" && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Approve the payment request on your phone. This page will update once it&apos;s confirmed —
            refresh in a moment.
          </span>
        </div>
      )}
      {result && result.status === "PAID" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Payment received. Thank you!
        </div>
      )}
      {result && result.status === "FAILED" && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}
    </form>
  );
}
