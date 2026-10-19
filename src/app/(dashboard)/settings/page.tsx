import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/guards";
import { getBusinessSettings } from "@/lib/settings";
import { saveSettingsAction } from "@/app/(dashboard)/settings/actions";
import { getT } from "@/lib/i18n/server";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const settings = await getBusinessSettings(session.tenantId);
  const t = await getT();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Business Settings")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("Customize branding, receipt text, and currency display.")}</p>
      </div>

      {params.saved === "1" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("Settings saved.")}
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t(params.error)}
        </div>
      )}

      <form action={saveSettingsAction} className="space-y-6">
        <Card className="space-y-4">
          <div>
            <p className="text-base font-semibold">{t("Branding")}</p>
            <p className="text-sm text-[var(--muted)]">{t("These values appear on receipts and print output.")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">{t("Business name")}</span>
              <Input name="businessName" defaultValue={settings.businessName} placeholder={t("Your business name")} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">{t("Brand color")}</span>
              <div className="flex items-center gap-3">
                <Input name="brandColor" type="color" defaultValue={settings.brandColor} className="h-11 w-20 p-1" />
                <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
                  {settings.brandColor}
                </div>
              </div>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">{t("Receipt subtitle")}</span>
              <Input
                name="receiptSubtitle"
                defaultValue={settings.receiptSubtitle}
                placeholder={t("Short line below the business name")}
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">{t("Receipt top info line")}</span>
              <Input
                name="receiptTopLine"
                defaultValue={settings.receiptTopLine}
                placeholder="ZAAD: EDAHAB: Address"
              />
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">{t("Receipt footer message")}</span>
              <textarea
                name="receiptFooter"
                defaultValue={settings.receiptFooter}
                rows={3}
                className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                placeholder={t("Thank you message or custom note")}
              />
            </label>

            <div className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">{t("Logo")}</span>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <Input name="logo" type="file" accept="image/*" />
                <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input type="checkbox" name="removeLogo" className="h-4 w-4 rounded border-[var(--border)]" />
                  {t("Remove current logo")}
                </label>
              </div>
              {settings.logoDataUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <img src={settings.logoDataUrl} alt={t("Current logo")} className="h-12 w-12 rounded-lg object-contain" />
                  <div className="text-sm text-[var(--muted)]">{t("Current logo preview")}</div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
                  {t("No logo uploaded yet.")}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-base font-semibold">{t("Multi-currency")}</p>
            <p className="text-sm text-[var(--muted)]">{t("When enabled, receipt amounts show USD first and the local value second.")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm md:col-span-3">
              <input
                type="checkbox"
                name="multiCurrencyEnabled"
                defaultChecked={settings.multiCurrencyEnabled}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              {t("Enable local currency display on receipts")}
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">{t("Local currency code")}</span>
              <Input name="localCurrencyCode" defaultValue={settings.localCurrencyCode} placeholder="SLSH" />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">{t("Exchange rate")}</span>
              <Input
                name="exchangeRate"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings.exchangeRate}
                placeholder="11000"
              />
            </label>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--muted)] md:col-span-1">
              {t("Example: $1 = {code} {rate}", {
                code: settings.localCurrencyCode,
                rate: settings.exchangeRate.toLocaleString()
              })}
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">{t("Save Settings")}</Button>
        </div>
      </form>
    </div>
  );
}