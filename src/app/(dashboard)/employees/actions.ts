"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { createEmployeeSchema, updateEmployeeSchema } from "@/lib/validators/employee";
import { createSalarySchema, updateSalarySchema } from "@/lib/validators/salary";
import { employeeRepository } from "@/lib/repositories/employee-repository";
import { salaryRepository } from "@/lib/repositories/salary-repository";
import { prisma } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";

function revalidateSalaryViews() {
  revalidatePath("/employees");
  revalidatePath("/employees/salaries");
  revalidatePath("/reports/salaries");
  revalidatePath("/reports/profit-loss");
}

export async function createEmployeeAction(formData: FormData) {
  const session = await requirePermission("employees.manage");

  const parsed = createEmployeeSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    position: String(formData.get("position") ?? ""),
    monthlySalary: String(formData.get("monthlySalary") ?? ""),
    isActive: true
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  const employee = await employeeRepository.create({
    tenantId: session.tenantId,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    position: parsed.data.position || undefined,
    monthlySalary: parsed.data.monthlySalary,
    isActive: parsed.data.isActive
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Employee",
    entityId: employee.id,
    action: "create",
    message: `Added employee "${parsed.data.fullName}"`
  });

  revalidatePath("/employees");
}

export async function updateEmployeeAction(employeeId: string, formData: FormData) {
  const session = await requirePermission("employees.manage");

  const parsed = updateEmployeeSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    position: String(formData.get("position") ?? ""),
    monthlySalary: String(formData.get("monthlySalary") ?? ""),
    isActive: formData.get("isActive") === "on"
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  const existing = await employeeRepository.byId(session.tenantId, employeeId);
  if (!existing) {
    throw new Error("Employee not found");
  }

  await employeeRepository.update(session.tenantId, employeeId, {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || null,
    position: parsed.data.position || null,
    monthlySalary: parsed.data.monthlySalary,
    isActive: parsed.data.isActive
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Employee",
    entityId: employeeId,
    action: "update",
    message: `Updated employee "${parsed.data.fullName}"`
  });

  revalidateSalaryViews();
  redirect("/employees");
}

export async function deleteEmployeeAction(employeeId: string) {
  const session = await requirePermission("employees.manage");

  const existing = await employeeRepository.byId(session.tenantId, employeeId);
  if (!existing) {
    throw new Error("Employee not found");
  }

  const salaryCount = await prisma.salary.count({
    where: { tenantId: session.tenantId, employeeId }
  });
  if (salaryCount > 0) {
    throw new Error("Employee has salary records. Deactivate the employee instead of deleting.");
  }

  await employeeRepository.remove(session.tenantId, employeeId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Employee",
    entityId: employeeId,
    action: "delete",
    message: `Deleted employee "${existing.fullName}"`
  });

  revalidatePath("/employees");
}

export async function createSalaryAction(input: unknown) {
  const session = await requirePermission("employees.manage");

  const parsed = createSalarySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid salary data");
  }

  const employee = await employeeRepository.byId(session.tenantId, parsed.data.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const salary = await salaryRepository.create({
    tenantId: session.tenantId,
    employeeId: parsed.data.employeeId,
    amount: parsed.data.amount,
    paymentDate: new Date(parsed.data.paymentDate),
    month: parsed.data.month,
    year: parsed.data.year,
    notes: parsed.data.notes || undefined
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Salary",
    entityId: salary.id,
    action: "create",
    message: `Paid salary of ${parsed.data.amount.toFixed(2)} to "${employee.fullName}" for ${parsed.data.month}/${parsed.data.year}`
  });

  revalidateSalaryViews();
}

export async function updateSalaryAction(salaryId: string, formData: FormData) {
  const session = await requirePermission("employees.manage");

  const parsed = updateSalarySchema.safeParse({
    amount: String(formData.get("amount") ?? ""),
    paymentDate: String(formData.get("paymentDate") ?? ""),
    month: String(formData.get("month") ?? ""),
    year: String(formData.get("year") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid salary data");
  }

  const existing = await salaryRepository.byId(session.tenantId, salaryId);
  if (!existing) {
    throw new Error("Salary payment not found");
  }

  await salaryRepository.update(session.tenantId, salaryId, {
    amount: parsed.data.amount,
    paymentDate: new Date(parsed.data.paymentDate),
    month: parsed.data.month,
    year: parsed.data.year,
    notes: parsed.data.notes || null
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Salary",
    entityId: salaryId,
    action: "update",
    message: `Updated salary payment for "${existing.employee.fullName}" (${parsed.data.month}/${parsed.data.year})`
  });

  revalidateSalaryViews();
  redirect("/employees/salaries");
}

export async function deleteSalaryAction(salaryId: string) {
  const session = await requirePermission("employees.manage");

  const existing = await salaryRepository.byId(session.tenantId, salaryId);
  if (!existing) {
    throw new Error("Salary payment not found");
  }

  await salaryRepository.remove(session.tenantId, salaryId);

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "Salary",
    entityId: salaryId,
    action: "delete",
    message: `Deleted salary payment for "${existing.employee.fullName}" (${existing.month}/${existing.year})`
  });

  revalidateSalaryViews();
}
