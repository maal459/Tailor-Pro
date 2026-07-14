import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Input } from "@/components/ui/input";

export function Topbar() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 print:hidden">
      <form className="relative w-full max-w-md" action="/search" method="get">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted)]" />
        <Input name="q" placeholder="Search customers, orders, payments…" className="pl-9" />
      </form>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
