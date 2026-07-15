"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Wallet, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/platform/tenants", label: "Tenants", icon: Building2 },
  { href: "/platform/finance", label: "Finance", icon: Wallet },
  { href: "/platform/plans", label: "Plans & Pricing", icon: Tags }
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
