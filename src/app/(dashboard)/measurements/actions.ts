"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function createMeasurementProfileAction(formData: FormData) {
  const session = await requireAuth();

  const customerId = String(formData.get("customerId") ?? "");
  const garmentTypeId = String(formData.get("garmentTypeId") ?? "");
  const name = String(formData.get("name") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const fieldsText = String(formData.get("fields") ?? "");

  if (!customerId || !garmentTypeId || !name) {
    throw new Error("Customer, garment type, and profile name are required");
  }

  const parsedFields = fieldsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [fieldName, fieldValue] = line.split(":").map((value) => value.trim());
      return { fieldName, fieldValue };
    })
    .filter((entry) => entry.fieldName && entry.fieldValue);

  await prisma.measurementProfile.create({
    data: {
      tenantId: session.tenantId,
      customerId,
      garmentTypeId,
      name,
      notes,
      fields: {
        create: parsedFields.map((entry) => ({
          tenantId: session.tenantId,
          fieldName: entry.fieldName,
          fieldValue: entry.fieldValue
        }))
      }
    }
  });

  revalidatePath("/measurements");
}
