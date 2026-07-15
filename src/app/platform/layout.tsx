import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";
import { PlatformNav } from "@/components/layout/platform-nav";
import { requireSuperAdmin } from "@/lib/auth/guards";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  // Every /platform route is gated to platform owners. A tenant admin who reaches
  // here is redirected to their own dashboard.
  await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="flex flex-col gap-3 border-b border-[var(--border)] bg-[#1A1D2E] px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#E6652E]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">Platform Administration</p>
              <p className="text-xs text-white/60">Manage all businesses on this deployment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Link>
            <LogoutButton />
          </div>
        </div>
        <PlatformNav />
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
