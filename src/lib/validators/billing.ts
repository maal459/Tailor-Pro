import { z } from "zod";

const methods = ["CASH", "ZAAD", "EDAHAB", "BANK_TRANSFER", "CARD", "MANUAL", "OTHER"] as const;
const cycles = ["MONTHLY", "YEARLY"] as const;
const plans = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const;

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0").optional(),
  method: z.enum(methods).default("MANUAL"),
  gatewayRef: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional()
});

export const planPriceSchema = z.object({
  plan: z.enum(plans),
  monthlyPrice: z.coerce.number().min(0, "Price cannot be negative"),
  yearlyPrice: z.coerce.number().min(0, "Price cannot be negative"),
  isActive: z.coerce.boolean().default(true)
});

export const payInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  provider: z.enum(["ZAAD", "EDAHAB"]),
  payerRef: z.string().min(4, "Enter a valid wallet / phone number")
});

export const tenantBillingSchema = z.object({
  billingCycle: z.enum(cycles),
  autoCollect: z.coerce.boolean().default(false),
  // Empty string means "no gateway"; normalised to null in the action.
  gatewayProvider: z.enum(["", "ZAAD", "EDAHAB"]).optional(),
  gatewayPayerRef: z.string().optional()
});

export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;
export type PlanPriceValues = z.infer<typeof planPriceSchema>;
export type TenantBillingValues = z.infer<typeof tenantBillingSchema>;
export type PayInvoiceValues = z.infer<typeof payInvoiceSchema>;
