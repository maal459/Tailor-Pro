import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear
} from "date-fns";

export type ReportPeriod = "today" | "week" | "month" | "year" | "custom";

export function parseReportPeriod(value?: string): ReportPeriod {
  return value === "today" || value === "week" || value === "year" || value === "custom"
    ? value
    : "month";
}

export function getReportRange(period: ReportPeriod, fromParam?: string, toParam?: string) {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "custom":
      return {
        from: fromParam ? startOfDay(new Date(fromParam)) : startOfMonth(now),
        to: toParam ? endOfDay(new Date(toParam)) : endOfDay(now)
      };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}
