import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none",
        "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
        className
      )}
      {...props}
    />
  );
}
