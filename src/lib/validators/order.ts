import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  deliveryDate: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  status: z.enum(["PENDING", "CUTTING", "SEWING", "FINISHING", "READY", "DELIVERED", "CANCELLED"]),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        garmentTypeId: z.string().min(1),
        measurementProfileId: z.string().optional(),
        fabric: z.string().optional(),
        color: z.string().optional(),
        quantity: z.coerce.number().int().min(1),
        unitPrice: z.coerce.number().min(0),
        tailoringInstructions: z.string().optional()
      })
    )
    .min(1)
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
