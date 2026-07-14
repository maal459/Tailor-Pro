"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import { getBusinessSettings, saveBusinessSettings } from "@/lib/settings";

function readText(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readNumber(formData: FormData, key: string, fallback: number) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Store the logo as a compact WebP data URL directly in the tenant's setting row.
// This avoids writing to the public/ folder (which Next does not reliably serve for
// files created after startup) and keeps the logo fully tenant-isolated in the DB.
async function fileToLogoDataUrl(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  if (!value.type.startsWith("image/")) {
    throw new Error("Logo must be an image file (PNG, JPG, or WebP).");
  }

  const input = Buffer.from(await value.arrayBuffer());

  let output: Buffer;
  try {
    output = await sharp(input)
      .resize(240, 240, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error("That image could not be read. Please try a different logo file.");
  }

  const dataUrl = `data:image/webp;base64,${output.toString("base64")}`;
  if (dataUrl.length > 60000) {
    throw new Error("This logo is too detailed to store — please use a simpler or smaller image.");
  }
  return dataUrl;
}

export async function saveSettingsAction(formData: FormData) {
  const session = await requireAuth();
  const current = await getBusinessSettings(session.tenantId);

  let uploadedLogo: string | null = null;
  try {
    uploadedLogo = await fileToLogoDataUrl(formData.get("logo"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process the logo image.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }

  await saveBusinessSettings(session.tenantId, {
    businessName: readText(formData, "businessName", current.businessName),
    receiptSubtitle: readText(formData, "receiptSubtitle", current.receiptSubtitle),
    receiptTopLine: readText(formData, "receiptTopLine", current.receiptTopLine),
    receiptFooter: readText(formData, "receiptFooter", current.receiptFooter),
    brandColor: readText(formData, "brandColor", current.brandColor),
    logoDataUrl: formData.get("removeLogo") === "on" ? "" : uploadedLogo ?? current.logoDataUrl,
    multiCurrencyEnabled: readBoolean(formData, "multiCurrencyEnabled"),
    exchangeRate: readNumber(formData, "exchangeRate", current.exchangeRate),
    localCurrencyCode: readText(formData, "localCurrencyCode", current.localCurrencyCode)
  });

  revalidatePath("/settings");
  revalidatePath("/receipts");
  redirect("/settings?saved=1");
}