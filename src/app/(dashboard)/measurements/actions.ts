"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

function parseFields(fieldsText: string) {
  return fieldsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [fieldName, fieldValue] = line.split(":").map((value) => value.trim());
      return { fieldName, fieldValue };
    })
    .filter((entry) => entry.fieldName && entry.fieldValue);
}

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

  const parsedFields = parseFields(fieldsText);

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

export async function updateMeasurementProfileAction(profileId: string, formData: FormData) {
  const session = await requireAuth();

  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");
  const garmentTypeId = String(formData.get("garmentTypeId") ?? "");
  const parsedFields = parseFields(String(formData.get("fields") ?? ""));
  if (!name) throw new Error("Profile name is required");

  const existing = await prisma.measurementProfile.findFirst({
    where: { id: profileId, tenantId: session.tenantId }
  });
  if (!existing) throw new Error("Measurement profile not found");

  await prisma.measurement.deleteMany({
    where: { tenantId: session.tenantId, measurementProfileId: profileId }
  });
  await prisma.measurementProfile.updateMany({
    where: { id: profileId, tenantId: session.tenantId },
    data: { name, notes, ...(garmentTypeId ? { garmentTypeId } : {}) }
  });
  if (parsedFields.length) {
    await prisma.measurement.createMany({
      data: parsedFields.map((entry) => ({
        tenantId: session.tenantId,
        measurementProfileId: profileId,
        fieldName: entry.fieldName,
        fieldValue: entry.fieldValue
      }))
    });
  }

  revalidatePath("/measurements");
  redirect("/measurements");
}

export async function deleteMeasurementProfileAction(profileId: string) {
  const session = await requireAuth();
  const existing = await prisma.measurementProfile.findFirst({
    where: { id: profileId, tenantId: session.tenantId }
  });
  if (!existing) throw new Error("Measurement profile not found");

  await prisma.measurementProfile.deleteMany({
    where: { id: profileId, tenantId: session.tenantId }
  });
  revalidatePath("/measurements");
}
