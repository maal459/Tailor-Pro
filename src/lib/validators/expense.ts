import { z } from "zod";

export const createExpenseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  expenseDate: z.string().optional(),
  paymentMethodId: z.string().optional(),
  notes: z.string().optional()
});

export const updateExpenseSchema = createExpenseSchema;

export const expenseCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional()
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
