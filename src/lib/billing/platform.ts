/**
 * Branding for the PLATFORM as the biller (Tailor Pro charging tenant businesses).
 * Distinct from a tenant's own tailor-shop branding — subscription invoices/receipts
 * are issued by the platform, not by the shop.
 */
export const PLATFORM_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Tailor Pro";
export const PLATFORM_TAGLINE = "Tailoring Management Platform";
export const PLATFORM_SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_CONTACT || "";

/** Human-friendly document numbers derived from the stable cuid ids. */
export function invoiceNumber(id: string) {
  return `INV-${id.slice(-8).toUpperCase()}`;
}
export function receiptNumber(id: string) {
  return `RCPT-${id.slice(-8).toUpperCase()}`;
}
