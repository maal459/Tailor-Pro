import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Input } from "@/components/ui/input";
import type { BusinessSettings } from "@/lib/settings";

export function Topbar({
  branding,
  isSuperAdmin = false
}: {
  branding: BusinessSettings;
  isSuperAdmin?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 print:hidden">
      <div className="flex w-full max-w-md items-center gap-2">
        <MobileNav branding={branding} isSuperAdmin={isSuperAdmin} />
        <form className="relative w-full" action="/search" method="get">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted)]" />
          <Input name="q" placeholder="Search…" className="pl-9" />
        </form>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
