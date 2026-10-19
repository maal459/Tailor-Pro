"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toaster";
import { deleteOnlineOrderAction } from "@/app/(dashboard)/online-orders/actions";

/** Deletes the order, then leaves the now-missing detail page for the list. */
export function DeleteOnlineOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs font-medium text-red-600 hover:underline"
      onClick={() => {
        if (!window.confirm(`Delete online order ${orderNumber}? This cannot be undone.`)) return;
        startTransition(async () => {
          try {
            await deleteOnlineOrderAction(orderId);
            toast.push("Online order deleted");
            router.push("/online-orders");
          } catch (error) {
            toast.push(error instanceof Error ? error.message : "Operation failed", "error");
          }
        });
      }}
    >
      {isPending ? "…" : "Delete order"}
    </button>
  );
}
