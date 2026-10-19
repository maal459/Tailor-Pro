import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/guards";
import { MarkNotificationsSeen } from "@/components/notifications/mark-notifications-seen";
import { buildNotificationItems } from "@/lib/notifications";
import { getT } from "@/lib/i18n/server";

export default async function NotificationsPage() {
  const session = await requireAuth();
  const { items } = await buildNotificationItems(session.tenantId, null);
  const t = await getT();

  return (
    <div className="space-y-6">
      <MarkNotificationsSeen />
      <div>
        <h1 className="text-2xl font-semibold">{t("Notifications")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("Operational alerts and follow-up items")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t(item.type)}</p>
            <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
          </Card>
        ))}
        {!items.length && <Card><p className="text-sm text-[var(--muted)]">{t("No notifications right now.")}</p></Card>}
      </div>
    </div>
  );
}
