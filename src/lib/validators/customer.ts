import { z } from "zod";

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  phone: z.string().trim().min(5, "Phone number must be at least 5 characters"),
  alternativePhone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const updateCustomerSchema = createCustomerSchema;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
