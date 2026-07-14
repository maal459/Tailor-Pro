"use client";

import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Option = { id: string; label: string };

export function CustomerHistorySelector({
  customers,
  selectedId
}: {
  customers: Option[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <SearchableSelect
      value={selectedId}
      onChange={(value) => router.push(`/orders/history?customerId=${value}`)}
      options={customers}
      placeholder="Search customer name or number…"
      className="min-w-72 flex-1"
    />
  );
}
