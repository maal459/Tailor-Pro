"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { createCustomerSchema } from "@/lib/validators/customer";
import { customerRepository } from "@/lib/repositories/customer-repository";

export async function createCustomerAction(formData: FormData) {
  const session = await requireAuth();

  const payload = {
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    alternativePhone: String(formData.get("alternativePhone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    notes: String(formData.get("notes") ?? "")
  };

  const parsed = createCustomerSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid customer data");
  }

  const timestamp = Date.now().toString().slice(-6);
  await customerRepository.create({
    tenantId: session.tenantId,
    customerNumber: `CUST-${timestamp}`,
    ...parsed.data,
    email: parsed.data.email || undefined
  });

  revalidatePath("/customers");
}
