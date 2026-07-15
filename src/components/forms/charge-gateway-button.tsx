"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { chargeInvoiceViaGatewayAction } from "@/app/platform/finance/actions";

/**
 * Admin button to push an online charge to the tenant's registered ZAAD/eDahab wallet.
 * PAID settles immediately; PENDING means the tenant must approve on their phone (the
 * webhook will settle it); FAILED shows why.
 */
export function ChargeGatewayButton({
  invoiceId,
  providerLabel
}: {
  invoiceId: string;
  providerLabel: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, start] = useTransition();

  const run = () => {
    if (!window.confirm(`Send an online payment request via ${providerLabel} to this tenant's wallet?`)) {
      return;
    }
    start(async () => {
      const r = await chargeInvoiceViaGatewayAction(invoiceId);
      if (r.status === "PAID") toast.push("Charged — invoice paid");
      else if (r.status === "PENDING") toast.push("Request sent — awaiting tenant approval");
      else toast.push(r.message, "error");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-500/20 disabled:opacity-50"
    >
      <Smartphone className="h-3.5 w-3.5" />
      {isPending ? "…" : `Charge ${providerLabel}`}
    </button>
  );
}
