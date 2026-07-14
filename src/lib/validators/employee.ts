import { z } from "zod";

export const createEmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
  position: z.string().optional(),
  monthlySalary: z.coerce.number().positive("Monthly salary must be greater than zero"),
  isActive: z.boolean().default(true)
});

export const updateEmployeeSchema = createEmployeeSchema;

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
