"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toaster";
import { useT } from "@/lib/i18n/client";

type Props = {
  label: string;
  action: () => Promise<void>;
  confirmText?: string;
  successMessage?: string;
  className?: string;
};

/**
 * Runs a server action from a list row with optional confirm dialog,
 * surfacing failures (e.g. blocked deletes) as toasts instead of crashes.
 */
export function ActionButton({ label, action, confirmText, successMessage, className }: Props) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const t = useT();

  return (
    <button
      type="button"
      disabled={isPending}
      className={className}
      onClick={() => {
        if (confirmText && !window.confirm(t(confirmText))) return;
        startTransition(async () => {
          try {
            await action();
            if (successMessage) toast.push(t(successMessage));
          } catch (error) {
            toast.push(error instanceof Error ? error.message : t("Operation failed"), "error");
          }
        });
      }}
    >
      {isPending ? "…" : t(label)}
    </button>
  );
}
