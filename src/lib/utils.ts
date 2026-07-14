import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currencyCode = "USD") {
  const isStandardCurrencyCode = /^[A-Z]{3}$/.test(currencyCode);

  if (isStandardCurrencyCode) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode
    }).format(value);
  }

  return `${currencyCode} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }
  return 0;
}
