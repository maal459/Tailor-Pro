"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { id: string; label: string };

type Props = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function SearchableSelect({
  name,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required,
  className
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Match anywhere in the label (not just the start), and cap how many are rendered so a
  // large list (thousands of customers/orders) never renders thousands of DOM nodes at once.
  const LIMIT = 50;
  const q = query.trim().toLowerCase();
  const matches = q ? options.filter((opt) => opt.label.toLowerCase().includes(q)) : options;
  const filtered = matches.slice(0, LIMIT);
  const overflow = matches.length - filtered.length;
  const selected = options.find((opt) => opt.id === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* hidden input for FormData submission */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
      >
        <span className={cn("truncate text-left", selected ? "text-[var(--text)]" : "text-[var(--muted)]")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
          {/* search input */}
          <div className="p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted)]" />
              <input
                autoFocus
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)]"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* option list */}
          <div className="max-h-52 overflow-y-auto pb-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-sm text-[var(--muted)]">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--primary)]/10",
                    value === opt.id && "bg-[var(--primary)]/10 font-semibold text-[var(--primary)]"
                  )}
                >
                  {opt.label}
                </button>
              ))
            )}
            {overflow > 0 && (
              <p className="px-3 py-2 text-center text-xs text-[var(--muted)]">
                +{overflow} more — keep typing to narrow
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
