import { z } from "zod";
import { ALL_PERMISSIONS } from "@/lib/auth/permissions";

const permissionValues = z.enum(ALL_PERMISSIONS);
const roleValues = z.enum(["admin", "manager", "accountant", "tailor", "viewer"]);

export const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: roleValues,
  isActive: z.boolean().default(true),
  permissions: z.array(permissionValues).default([])
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: roleValues,
  isActive: z.boolean().default(true),
  permissions: z.array(permissionValues).default([])
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
