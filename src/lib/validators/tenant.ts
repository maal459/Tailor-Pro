import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const plans = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const;
const statuses = ["ACTIVE", "SUSPENDED", "CANCELLED"] as const;

export const createTenantSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  slug: z
    .string()
    .min(2)
    .regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens (e.g. style-tailors)"),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email("A valid owner email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  subscriptionPlan: z.enum(plans).default("FREE")
});

export const updateTenantSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  ownerName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  subscriptionPlan: z.enum(plans),
  status: z.enum(statuses)
});

export const tenantStatusSchema = z.enum(statuses);

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
