"use client";

import { useT } from "@/lib/i18n/client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
    >
      {t(label)}
    </button>
  );
}
