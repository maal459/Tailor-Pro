"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";
import { useT } from "@/lib/i18n/client";
import { deleteOnlineOrderAction } from "@/app/(dashboard)/online-orders/actions";

/** Deletes the order, then leaves the now-missing detail page for the list. */
export function DeleteOnlineOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const t = useT();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs font-medium text-red-600 hover:underline"
      onClick={() => {
        if (!window.confirm(t("Delete online order {number}? This cannot be undone.", { number: orderNumber }))) return;
        startTransition(async () => {
          try {
            await deleteOnlineOrderAction(orderId);
            toast.push(t("Online order deleted"));
            router.push("/online-orders");
          } catch (error) {
            toast.push(error instanceof Error ? error.message : t("Operation failed"), "error");
          }
        });
      }}
    >
      {isPending ? "…" : t("Delete order")}
    </button>
  );
}
