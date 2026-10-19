import { billing } from "@/lib/i18n/so/billing";
import { common } from "@/lib/i18n/so/common";
import { general } from "@/lib/i18n/so/general";
import { inventory } from "@/lib/i18n/so/inventory";
import { orders } from "@/lib/i18n/so/orders";
import { payments } from "@/lib/i18n/so/payments";
import { reports } from "@/lib/i18n/so/reports";

/**
 * Somali UI text, keyed by the English string shown in the interface.
 * Each area of the app keeps its strings in its own file; later files win on duplicates.
 */
export const so: Record<string, string> = {
  ...general,
  ...orders,
  ...payments,
  ...inventory,
  ...reports,
  ...billing,
  ...common
};
