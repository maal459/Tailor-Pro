import { z } from "zod";

export const createSupplierSchema = z.object({
  supplierName: z.string().min(2, "Supplier name must be at least 2 characters"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional()
});

export const updateSupplierSchema = createSupplierSchema;

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
