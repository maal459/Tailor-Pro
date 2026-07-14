import { z } from "zod";

export const createCustomerSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  alternativePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional()
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
