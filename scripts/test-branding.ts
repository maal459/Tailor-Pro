/**
 * Verifies the branding fixes:
 *  - logo pipeline: sharp resize -> compact WebP data URL -> stored in Setting ->
 *    read back via getBusinessSettings -> resolveLogoSrc accepts it (renders inline).
 *  - brand color: a saved color round-trips and is what the dashboard injects.
 * Restores the tenant's original settings afterward.
 */
import sharp from "sharp";
import { prismaUnsafe } from "@/lib/db/prisma";
import { getBusinessSettings, saveBusinessSettings, resolveLogoSrc } from "@/lib/settings";

const tenantId = "tenant_demo";
let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  -> ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
};

// snapshot to restore
const before = await getBusinessSettings(tenantId);

// Build a synthetic 900x900 PNG (larger than the 240px cap) to exercise the resize.
const bigPng = await sharp({
  create: { width: 900, height: 900, channels: 3, background: { r: 20, g: 120, b: 200 } }
})
  .png()
  .toBuffer();
console.log(`Source image: ${bigPng.length} bytes (900x900 PNG)`);

// Same pipeline the settings action uses.
const out = await sharp(bigPng).resize(240, 240, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
const dataUrl = `data:image/webp;base64,${out.toString("base64")}`;
const meta = await sharp(out).metadata();

console.log("\n1. Logo pipeline produces a small, valid data URL");
check("resized within 240x240", (meta.width ?? 999) <= 240 && (meta.height ?? 999) <= 240, meta);
check("output is webp", meta.format === "webp");
check("data URL fits well under the 60KB Setting cap", dataUrl.length < 60000, `${dataUrl.length} chars`);
check("data URL has the data: scheme", dataUrl.startsWith("data:image/webp;base64,"));

console.log("\n2. Stored logo + brand color round-trip through settings");
await saveBusinessSettings(tenantId, { ...before, logoDataUrl: dataUrl, brandColor: "#22a3d2" });
const after = await getBusinessSettings(tenantId);
check("logoDataUrl persisted as the data URL", after.logoDataUrl === dataUrl);
check("resolveLogoSrc accepts the data URL (renders inline)", resolveLogoSrc(after.logoDataUrl) === dataUrl);
check("brandColor persisted", after.brandColor === "#22a3d2");

console.log("\n3. Invalid image is rejected by sharp");
let rejected = false;
try {
  await sharp(Buffer.from("this is not an image")).resize(240).webp().toBuffer();
} catch {
  rejected = true;
}
check("non-image input throws (surfaced as a friendly error in the action)", rejected);

// restore original settings
await saveBusinessSettings(tenantId, before);
const restored = await getBusinessSettings(tenantId);
check("original settings restored", restored.brandColor === before.brandColor && restored.logoDataUrl === before.logoDataUrl);

await prismaUnsafe.$disconnect();
console.log(failures ? `\n${failures} CHECK(S) FAILED` : "\nAll branding checks passed");
process.exit(failures ? 1 : 0);
