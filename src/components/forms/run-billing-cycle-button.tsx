"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { runBillingCycleAction } from "@/app/platform/finance/actions";

/**
 * Runs the dunning cycle on demand: attempts auto-collect, flags overdue invoices, and
 * suspends tenants past the grace period. The same logic runs on a cron in production.
 */
export function RunBillingCycleButton() {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const run = () => {
    if (!window.confirm("Run the billing cycle now? This may suspend tenants overdue beyond the grace period.")) {
      return;
    }
    startTransition(async () => {
      try {
        const report = await runBillingCycleAction();
        const parts = [
          `${report.markedOverdue} marked overdue`,
          `${report.autoCollected.length} auto-collected`,
          `${report.suspended.length} suspended`
        ];
        toast.push(`Billing cycle done: ${parts.join(", ")}`);
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Billing cycle failed", "error");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Running…" : "Run billing cycle"}
    </button>
  );
}
