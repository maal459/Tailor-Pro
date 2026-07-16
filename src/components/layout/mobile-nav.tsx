"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessSettings } from "@/lib/settings";
import { NAV_ITEMS } from "@/components/layout/nav-items";

/**
 * Mobile navigation: a hamburger button (shown only below `lg`) that opens the same nav
 * links as the desktop sidebar in a slide-in drawer. The desktop `<aside>` is hidden on
 * small screens, so without this there is no navigation on phones/tablets.
 */
export function MobileNav({
  branding,
  isSuperAdmin = false
}: {
  branding: BusinessSettings;
  isSuperAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-black/5"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={close} />

          {/* Drawer */}
          <aside className="relative z-10 flex h-full w-72 max-w-[85%] flex-col overflow-y-auto bg-[#1A1D2E] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                {branding.logoDataUrl ? (
                  <img src={branding.logoDataUrl} alt={branding.businessName} className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-xs font-bold uppercase">
                    {branding.businessName.slice(0, 2)}
                  </div>
                )}
                <span className="truncate text-sm font-semibold uppercase tracking-[0.14em]">
                  {branding.businessName}
                </span>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-[var(--primary)] text-white shadow-lg"
                        : "text-[#8892A0] hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}

              {isSuperAdmin && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <Link
                    href="/platform/tenants"
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      pathname.startsWith("/platform")
                        ? "bg-[var(--primary)] text-white shadow-lg"
                        : "text-[#8892A0] hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Platform Admin
                  </Link>
                </div>
              )}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
