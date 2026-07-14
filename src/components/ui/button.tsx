"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[var(--primary)] text-white hover:opacity-90",
        variant === "secondary" && "bg-[var(--card)] border border-[var(--border)] text-[var(--text)] hover:bg-black/5",
        variant === "ghost" && "text-[var(--text)] hover:bg-black/5",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
