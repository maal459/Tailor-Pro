"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

// Headers and the empty message are English UI text, translated here so every table
// follows the viewer's language without each page translating its column names.

export function DataTable({
  headers,
  children,
  emptyMessage = "No records found."
}: {
  headers: string[];
  children: ReactNode;
  emptyMessage?: string;
}) {
  const t = useT();

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
              >
                {t(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children ?? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-10 text-center text-sm text-[var(--muted)]"
              >
                {t(emptyMessage)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
