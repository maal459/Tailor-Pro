import type { ReactNode } from "react";

export function DataTable({
  headers,
  children,
  emptyMessage = "No records found."
}: {
  headers: string[];
  children: ReactNode;
  emptyMessage?: string;
}) {
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
                {header}
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
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
