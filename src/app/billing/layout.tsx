import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { requireAuth } from "@/lib/auth/guards";
import { LogoutButton } from "@/components/layout/logout-button";
import { prismaUnsafe } from "@/lib/db/prisma";

/**
 * The tenant billing portal lives OUTSIDE the (dashboard) group on purpose: a tenant
 * suspended for non-payment is locked out of the dashboard but must still be able to
 * reach this page to pay and restore access. So this layout checks auth only — never
 * tenant status. Chrome is hidden when printing an invoice/receipt.
 */
export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const tenant = await prismaUnsafe.tenant.findUnique({
    where: { id: session.tenantId },
    select: { businessName: true, status: true }
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="print:hidden flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Subscription &amp; Billing</p>
            <p className="text-xs text-[var(--muted)]">{tenant?.businessName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tenant?.status === "ACTIVE" && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-black/5"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>
      <main className="p-4 md:p-6 print:p-0">{children}</main>
    </div>
  );
}
