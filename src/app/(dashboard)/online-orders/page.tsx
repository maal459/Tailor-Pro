import Link from "next/link";
import { format } from "date-fns";
import type { OnlineOrderStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/guards";
import { onlineOrderRepository } from "@/lib/repositories/online-order-repository";
import { ONLINE_ORDER_STATUSES } from "@/lib/validators/online-order";
import { getTenant } from "@/lib/tenant";
import { formatCurrency, toNumber } from "@/lib/utils";

const PAGE_SIZE = 20;

export default async function OnlineOrdersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requirePermission("orders.manage");
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const status = (ONLINE_ORDER_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as OnlineOrderStatus)
    : undefined;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const [{ rows, total }, counts, tenant] = await Promise.all([
    onlineOrderRepository.list(session.tenantId, { query: q, status }, page, PAGE_SIZE),
    onlineOrderRepository.countByStatus(session.tenantId),
    getTenant(session.tenantId)
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(target));
    return `/online-orders?${sp.toString()}`;
  };
  const shopPath = tenant ? `/shop/${tenant.slug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Online Orders</h1>
          <p className="text-sm text-[var(--muted)]">Orders customers placed on your public shop page</p>
        </div>
        {shopPath && (
          <a
            href={shopPath}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            Open shop page
          </a>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {ONLINE_ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/online-orders?status=${s}`}>
            <Card className={status === s ? "border-[var(--primary)]" : undefined}>
              <p className="text-sm text-[var(--muted)]">{s}</p>
              <p className="mt-2 text-2xl font-semibold">{counts[s] ?? 0}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <form className="mb-4 grid gap-3 md:grid-cols-4" method="get">
          <Input name="q" placeholder="Search order no., name or phone" defaultValue={q} className="md:col-span-2" />
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {ONLINE_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button variant="secondary" type="submit">
              Filter
            </Button>
            {(q || status) && (
              <Link href="/online-orders" className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm">
                Clear
              </Link>
            )}
          </div>
        </form>

        <DataTable
          headers={["Order", "Date", "Customer", "Phone", "Items", "Total", "Status", ""]}
          emptyMessage="No online orders yet."
        >
          {rows.length
            ? rows.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border)] transition-colors hover:bg-[var(--bg)]">
                  <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3">{format(order.createdAt, "dd MMM yyyy, HH:mm")}</td>
                  <td className="px-4 py-3 font-medium">{order.customerName}</td>
                  <td className="px-4 py-3">{order.phone}</td>
                  <td className="px-4 py-3">{order._count.items}</td>
                  <td className="px-4 py-3">{formatCurrency(toNumber(order.total))}</td>
                  <td className="px-4 py-3">
                    <Badge label={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/online-orders/${order.id}`}
                      className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            : null}
        </DataTable>

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-end gap-3 text-sm">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded-xl border border-[var(--border)] px-3 py-1.5">
                Previous
              </Link>
            )}
            <span className="text-[var(--muted)]">
              Page {page} of {pageCount}
            </span>
            {page < pageCount && (
              <Link href={pageHref(page + 1)} className="rounded-xl border border-[var(--border)] px-3 py-1.5">
                Next
              </Link>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
