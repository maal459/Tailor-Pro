import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LogoutButton } from "@/components/layout/logout-button";
import { requireAuth, currentUserIsSuperAdmin } from "@/lib/auth/guards";
import { getBusinessSettings } from "@/lib/settings";
import { isTenantActive } from "@/lib/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  // Central lockout: a suspended/cancelled tenant can hold a valid session for up to
  // the JWT lifetime, so re-check status on every dashboard load. Rendering a notice
  // (instead of redirecting) avoids a loop with the login page's own session check.
  if (!(await isTenantActive(session.tenantId))) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Account unavailable</h1>
          <p className="text-sm text-[var(--muted)]">
            This business account is currently suspended for an unpaid subscription. Settle your
            outstanding invoice to restore access instantly.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="/billing"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Pay subscription
            </a>
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  const [settings, isSuperAdmin] = await Promise.all([
    getBusinessSettings(session.tenantId),
    currentUserIsSuperAdmin()
  ]);

  return (
    // The tenant's chosen brand color overrides the default --primary for the whole
    // dashboard; every `var(--primary)` usage (buttons, active nav, accents) follows it.
    <div className="flex min-h-screen" style={{ ["--primary"]: settings.brandColor } as React.CSSProperties}>
      <Sidebar branding={settings} isSuperAdmin={isSuperAdmin} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar branding={settings} isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
