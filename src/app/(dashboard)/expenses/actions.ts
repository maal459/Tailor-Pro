"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseCategorySchema
} from "@/lib/validators/expense";
import { expenseRepository } from "@/lib/repositories/expense-repository";
import { logActivity } from "@/lib/activity-log";

function revalidateExpenseViews() {
  revalidatePath("/expenses");
  revalidatePath("/reports/expenses");
  revalidatePath("/reports/profit-loss");
}

export async function createExpenseAction(formData: FormData) {
  const session = await requirePermission("expenses.manage");

  const parsed = createExpenseSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    expenseDate: String(formData.get("expenseDate") ?? ""),
    paymentMethodId: String(formData.get("paymentMethodId") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid expense data");
  }

  const expense = await expenseRepository.create({
    tenantId: session.tenantId,
    title: parsed.data.title,
    categoryId: parsed.data.categoryId || undefined,
    amount: parsed.data.amount,
    expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : undefined,
    paymentMethodId: parsed.data.paymentMethodId || undefined,
    createdById: session.userId,
    notes: parsed.data.notes || undefined
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Expense",
    entityId: expense.id,
    action: "create",
    message: `Recorded expense "${parsed.data.title}" of ${parsed.data.amount.toFixed(2)}`
  });

  revalidateExpenseViews();
}

export async function updateExpenseAction(expenseId: string, formData: FormData) {
  const session = await requirePermission("expenses.manage");

  const parsed = updateExpenseSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    expenseDate: String(formData.get("expenseDate") ?? ""),
    paymentMethodId: String(formData.get("paymentMethodId") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid expense data");
  }

  const existing = await expenseRepository.byId(session.tenantId, expenseId);
  if (!existing) {
    throw new Error("Expense not found");
  }

  await expenseRepository.update(session.tenantId, expenseId, {
    title: parsed.data.title,
    categoryId: parsed.data.categoryId || null,
    amount: parsed.data.amount,
    expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : undefined,
    paymentMethodId: parsed.data.paymentMethodId || null,
    notes: parsed.data.notes || null
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Expense",
    entityId: expenseId,
    action: "update",
    message: `Updated expense "${parsed.data.title}"`
  });

  revalidateExpenseViews();
  redirect("/expenses");
}

export async function deleteExpenseAction(expenseId: string) {
  const session = await requirePermission("expenses.manage");

  const existing = await expenseRepository.byId(session.tenantId, expenseId);
  if (!existing) {
    throw new Error("Expense not found");
  }

  await expenseRepository.remove(session.tenantId, expenseId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Expense",
    entityId: expenseId,
    action: "delete",
    message: `Deleted expense "${existing.title}"`
  });

  revalidateExpenseViews();
}

export async function createExpenseCategoryAction(formData: FormData) {
  const session = await requirePermission("expenses.manage");

  const parsed = expenseCategorySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid category data");
  }

  const category = await expenseRepository.createCategory({
    tenantId: session.tenantId,
    name: parsed.data.name,
    description: parsed.data.description || undefined
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "ExpenseCategory",
    entityId: category.id,
    action: "create",
    message: `Created expense category "${parsed.data.name}"`
  });

  revalidatePath("/expenses");
}

export async function deleteExpenseCategoryAction(categoryId: string) {
  const session = await requirePermission("expenses.manage");

  const categories = await expenseRepository.listCategories(session.tenantId);
  const existing = categories.find((category) => category.id === categoryId);
  if (!existing) {
    throw new Error("Category not found");
  }

  await expenseRepository.removeCategory(session.tenantId, categoryId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "ExpenseCategory",
    entityId: categoryId,
    action: "delete",
    message: `Deleted expense category "${existing.name}"`
  });

  revalidatePath("/expenses");
}
