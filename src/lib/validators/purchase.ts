import { z } from "zod";

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  invoiceNo: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        unitCost: z.coerce.number().min(0)
      })
    )
    .min(1, "Add at least one purchase item")
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
