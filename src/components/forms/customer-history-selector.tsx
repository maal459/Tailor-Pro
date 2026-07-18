"use client";

import { useRouter } from "next/navigation";
import { SearchableSelect } from "@/components/ui/searchable-select";

type Option = { id: string; label: string };

export function CustomerHistorySelector({
  customers,
  selectedId,
  basePath = "/orders/history"
}: {
  customers: Option[];
  selectedId: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <SearchableSelect
      value={selectedId}
      onChange={(value) => router.push(`${basePath}?customerId=${value}`)}
      options={customers}
      placeholder="Search by phone or name…"
      className="min-w-72 flex-1"
    />
  );
}
