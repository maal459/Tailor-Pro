import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { createT, type TFunction } from "@/lib/i18n/translate";

/** The viewer's chosen UI language, read from the `lang` cookie set by the language switcher. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translator for server components and server actions. */
export async function getT(): Promise<TFunction> {
  return createT(await getLocale());
}
