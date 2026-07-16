import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear
} from "date-fns";

export type ReportPeriod = "today" | "week" | "month" | "year" | "all" | "custom";

export function parseReportPeriod(value?: string): ReportPeriod {
  return value === "today" || value === "week" || value === "year" || value === "all" || value === "custom"
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
    case "all":
      // Everything on record — useful after importing years of historical data.
      return { from: new Date("2000-01-01T00:00:00.000Z"), to: new Date("2999-12-31T23:59:59.000Z") };
    case "custom":
      return {
        from: fromParam ? startOfDay(new Date(fromParam)) : startOfMonth(now),
        to: toParam ? endOfDay(new Date(toParam)) : endOfDay(now)
      };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}
