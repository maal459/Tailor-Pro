"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, isLocale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();

  return (
    <label className={className ?? "relative flex items-center"}>
      <span className="sr-only">{t("Language")}</span>
      <Languages className="pointer-events-none absolute left-2.5 h-4 w-4 text-[var(--muted)]" />
      <select
        value={locale}
        aria-label={t("Language")}
        onChange={(event) => {
          const next = event.target.value;
          if (!isLocale(next)) return;
          document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
          router.refresh();
        }}
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] pl-8 pr-2 text-sm"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
