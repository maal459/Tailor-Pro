"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Ruler, Scissors, Wallet, BarChart3,
  BookOpen, ReceiptText, Bell, Search, History, Settings2,
  DollarSign, UsersRound, Truck, Boxes, ShoppingCart, ShieldCheck, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessSettings } from "@/lib/settings";

const items = [
  { href: "/dashboard",     label: "Dashboard",    icon: Home },
  { href: "/customers",     label: "Customers",    icon: Users },
  { href: "/measurements",  label: "Measurements", icon: Ruler },
  { href: "/orders",        label: "Orders",       icon: Scissors },
  { href: "/orders/history",label: "Order History", icon: History },
  { href: "/payments",      label: "Payments",     icon: Wallet },
  { href: "/users",         label: "Users",        icon: Users },
  { href: "/search",        label: "Search",       icon: Search },
  { href: "/reports",       label: "Reports",      icon: BarChart3 },
  { href: "/expenses",      label: "Expenses",     icon: DollarSign },
  { href: "/employees",     label: "Employees",    icon: UsersRound },
  { href: "/suppliers",     label: "Suppliers",    icon: Truck },
  { href: "/products",      label: "Products",     icon: Boxes },
  { href: "/purchases",     label: "Purchases",    icon: ShoppingCart },
  { href: "/notifications", label: "Notifications",icon: Bell },
  { href: "/ledger",        label: "Ledger",       icon: BookOpen },
  { href: "/receipts",      label: "Receipts",     icon: ReceiptText },
  { href: "/billing",       label: "Subscription", icon: CreditCard },
  { href: "/settings",      label: "Settings",     icon: Settings2 },
];

export function Sidebar({
  branding,
  isSuperAdmin = false
}: {
  branding: BusinessSettings;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col bg-[#1A1D2E] lg:flex min-h-screen print:!hidden">
      <div className="p-4">
        {/* Brand header */}
        <div className="mb-6 overflow-hidden rounded-2xl p-[1px]"
          style={{ background: "linear-gradient(135deg, var(--primary), #4B3BCF)" }}>
          <div className="rounded-[15px] bg-gradient-to-br from-[var(--primary)] to-[#4B3BCF] p-4 text-white">
            <div className="flex items-center gap-3">
              {branding.logoDataUrl ? (
                <img
                  src={branding.logoDataUrl}
                  alt={branding.businessName}
                  className="h-12 w-12 rounded-xl bg-white object-contain p-1 shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-sm font-bold uppercase">
                  {branding.businessName.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] opacity-85">
                  {branding.businessName}
                </p>
                <p className="truncate text-xs opacity-75">{branding.receiptSubtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
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
        </nav>

        {isSuperAdmin && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <Link
              href="/platform/tenants"
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
      </div>
    </aside>
  );
}
