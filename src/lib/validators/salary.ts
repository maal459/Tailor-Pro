import { z } from "zod";

export const createSalarySchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentDate: z.string().min(1, "Payment date is required"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  notes: z.string().optional()
});

export const updateSalarySchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paymentDate: z.string().min(1, "Payment date is required"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  notes: z.string().optional()
});

export type CreateSalaryInput = z.infer<typeof createSalarySchema>;
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>;
