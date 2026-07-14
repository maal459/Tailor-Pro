import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  amount: z.coerce.number().positive(),
  referenceNo: z.string().optional(),
  notes: z.string().optional()
});

export const updatePaymentSchema = z.object({
  paymentMethodId: z.string().min(1),
  amount: z.coerce.number().positive(),
  referenceNo: z.string().optional(),
  notes: z.string().optional()
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
