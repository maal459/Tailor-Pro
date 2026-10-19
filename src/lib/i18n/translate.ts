import type { Locale } from "@/lib/i18n/config";
import { so } from "@/lib/i18n/so";

export type TranslationVars = Record<string, string | number>;
export type TFunction = (text: string, vars?: TranslationVars) => string;

/**
 * Dictionaries are keyed by the English UI text itself, so English needs no dictionary
 * and any string without a Somali entry falls back to English instead of breaking.
 * `{name}` placeholders are filled from `vars` in both languages.
 */
const DICTIONARIES: Record<Locale, Record<string, string>> = {
  en: {},
  so
};

export function translate(locale: Locale, text: string, vars?: TranslationVars): string {
  const template = DICTIONARIES[locale][text] ?? text;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

export function createT(locale: Locale): TFunction {
  return (text, vars) => translate(locale, text, vars);
}
