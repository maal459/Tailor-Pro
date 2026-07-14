import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  supplierId: z.string().optional(),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be below zero"),
  minimumStock: z.coerce.number().int().min(0),
  unit: z.string().optional()
});

export const updateProductSchema = createProductSchema;

export const productCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional()
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductCategoryInput = z.infer<typeof productCategorySchema>;
