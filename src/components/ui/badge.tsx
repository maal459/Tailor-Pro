import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
  PENDING:   "bg-amber-100  text-amber-700",
  CUTTING:   "bg-sky-100    text-sky-700",
  SEWING:    "bg-blue-100   text-blue-700",
  FINISHING: "bg-violet-100 text-violet-700",
  READY:     "bg-emerald-100 text-emerald-700",
  DELIVERED: "bg-green-100  text-green-700",
  CANCELLED: "bg-red-100    text-red-700",
  LOW:       "bg-slate-100  text-slate-600",
  NORMAL:    "bg-blue-100   text-blue-700",
  HIGH:      "bg-orange-100 text-orange-700",
  URGENT:    "bg-red-100    text-red-700",
};

export function Badge({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "success" | "warn" | "danger";
}) {
  const statusClass = STATUS_CLASSES[label];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        statusClass ?? (
          tone === "success" ? "bg-emerald-100 text-emerald-700" :
          tone === "warn"    ? "bg-amber-100   text-amber-700"   :
          tone === "danger"  ? "bg-red-100     text-red-700"     :
                               "bg-slate-100   text-slate-600"
        )
      )}
    >
      {label}
    </span>
  );
}
