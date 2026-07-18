"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboResult = { id: string; label: string; [key: string]: unknown };

/**
 * Server-backed combobox. Instead of loading every record into the page and filtering
 * client-side (slow with thousands of rows), it fetches matches from `endpoint?q=` as the
 * user types (debounced). With an empty query the endpoint returns the most recent rows,
 * so it opens instantly. Used for customer/order pickers across the app.
 */
export function AsyncCombobox({
  endpoint,
  value,
  onSelect,
  placeholder = "Search…",
  initialLabel = "",
  className
}: {
  endpoint: string;
  value: string;
  onSelect: (result: ComboResult | null) => void;
  placeholder?: string;
  initialLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComboResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        setResults(res.ok ? ((await res.json()) as ComboResult[]) : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, endpoint]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
      >
        <span className={cn("truncate text-left", selectedLabel ? "text-[var(--text)]" : "text-[var(--muted)]")}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted)]" />
              <input
                autoFocus
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)]"
                placeholder="Type phone or name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto pb-2">
            {loading ? (
              <p className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-[var(--muted)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-center text-sm text-[var(--muted)]">
                {query ? "No matches" : "Type to search…"}
              </p>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onSelect(r);
                    setSelectedLabel(r.label);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--primary)]/10",
                    value === r.id && "bg-[var(--primary)]/10 font-semibold text-[var(--primary)]"
                  )}
                >
                  {r.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
