import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none",
        "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
        className
      )}
      {...props}
    />
  );
}
