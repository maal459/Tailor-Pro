import { prisma } from "@/lib/db/prisma";

const DEFAULT_BRAND_COLOR = "#E6652E";
const DEFAULT_BUSINESS_NAME = "Tailor Pro";

export type BusinessSettings = {
  businessName: string;
  receiptSubtitle: string;
  receiptTopLine: string;
  receiptFooter: string;
  brandColor: string;
  logoDataUrl: string;
  multiCurrencyEnabled: boolean;
  exchangeRate: number;
  localCurrencyCode: string;
};

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: DEFAULT_BUSINESS_NAME,
  receiptSubtitle: "Professional Tailoring Services",
  receiptTopLine: "ZAAD: EDAHAB: Address",
  receiptFooter: "Thank you for choosing Tailor Pro",
  brandColor: DEFAULT_BRAND_COLOR,
  logoDataUrl: "",
  multiCurrencyEnabled: false,
  exchangeRate: 11000,
  localCurrencyCode: "SLSH"
};

const SETTING_KEYS = {
  businessName: "branding.businessName",
  receiptSubtitle: "branding.receiptSubtitle",
  receiptTopLine: "branding.receiptTopLine",
  receiptFooter: "branding.receiptFooter",
  brandColor: "branding.brandColor",
  logoDataUrl: "branding.logoDataUrl",
  multiCurrencyEnabled: "currency.multiCurrencyEnabled",
  exchangeRate: "currency.exchangeRate",
  localCurrencyCode: "currency.localCurrencyCode"
} as const;

function readBoolean(value: string | null | undefined, fallback: boolean) {
  if (value == null) return fallback;
  return value === "true" || value === "1";
}

function readNumber(value: string | null | undefined, fallback: number) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
}

function readText(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function resolveLogoSrc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return "";
}

export async function getBusinessSettings(tenantId: string): Promise<BusinessSettings> {
  const rows = await prisma.setting.findMany({
    where: { tenantId },
    select: { key: true, value: true }
  });

  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    businessName: readText(values[SETTING_KEYS.businessName], DEFAULT_SETTINGS.businessName),
    receiptSubtitle: readText(values[SETTING_KEYS.receiptSubtitle], DEFAULT_SETTINGS.receiptSubtitle),
    receiptTopLine: readText(values[SETTING_KEYS.receiptTopLine], DEFAULT_SETTINGS.receiptTopLine),
    receiptFooter: readText(values[SETTING_KEYS.receiptFooter], DEFAULT_SETTINGS.receiptFooter),
    brandColor: readColor(values[SETTING_KEYS.brandColor], DEFAULT_SETTINGS.brandColor),
    logoDataUrl: resolveLogoSrc(values[SETTING_KEYS.logoDataUrl] ?? DEFAULT_SETTINGS.logoDataUrl),
    multiCurrencyEnabled: readBoolean(
      values[SETTING_KEYS.multiCurrencyEnabled],
      DEFAULT_SETTINGS.multiCurrencyEnabled
    ),
    exchangeRate: readNumber(values[SETTING_KEYS.exchangeRate], DEFAULT_SETTINGS.exchangeRate),
    localCurrencyCode: readText(values[SETTING_KEYS.localCurrencyCode], DEFAULT_SETTINGS.localCurrencyCode)
  };
}

export async function saveBusinessSettings(
  tenantId: string,
  settings: BusinessSettings
) {
  const entries = [
    [SETTING_KEYS.businessName, settings.businessName],
    [SETTING_KEYS.receiptSubtitle, settings.receiptSubtitle],
    [SETTING_KEYS.receiptTopLine, settings.receiptTopLine],
    [SETTING_KEYS.receiptFooter, settings.receiptFooter],
    [SETTING_KEYS.brandColor, settings.brandColor],
    [SETTING_KEYS.logoDataUrl, settings.logoDataUrl],
    [SETTING_KEYS.multiCurrencyEnabled, String(settings.multiCurrencyEnabled)],
    [SETTING_KEYS.exchangeRate, String(settings.exchangeRate)],
    [SETTING_KEYS.localCurrencyCode, settings.localCurrencyCode]
  ] as const;

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key } },
        create: { tenantId, key, value },
        update: { value }
      })
    )
  );
}

export function getDefaultBusinessSettings() {
  return DEFAULT_SETTINGS;
}