"use client";

import { useRouter } from "next/navigation";
import { AsyncCombobox } from "@/components/ui/async-combobox";

/**
 * Navigate-on-select customer picker (ledger, order history). Server-backed search, so it
 * doesn't load every customer into the page. `initialLabel` shows the current selection.
 */
export function CustomerHistorySelector({
  selectedId,
  initialLabel = "",
  basePath = "/orders/history"
}: {
  selectedId: string;
  initialLabel?: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <AsyncCombobox
      endpoint="/api/search/customers"
      value={selectedId}
      initialLabel={initialLabel}
      onSelect={(r) => { if (r) router.push(`${basePath}?customerId=${r.id}`); }}
      placeholder="Search by phone or name…"
      className="min-w-72 flex-1"
    />
  );
}
