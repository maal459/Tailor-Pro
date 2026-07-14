"use client";

import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Option = { id: string; label: string };

export function ReceiptOrderSelector({
  orders,
  selectedId
}: {
  orders: Option[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <SearchableSelect
      value={selectedId}
      onChange={(v) => router.push(`/receipts?orderId=${v}`)}
      options={orders}
      placeholder="Search order or customer name…"
      className="min-w-72 flex-1"
    />
  );
}
