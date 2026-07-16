import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth/guards";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { financeService } from "@/lib/services/finance-service";
import { formatCurrency, cn } from "@/lib/utils";

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const customer = await customerRepository.byId(session.tenantId, id);
  if (!customer) notFound();

  const ledger = await financeService.customerLedger(session.tenantId, id);
  const totalBilled = ledger.reduce((s, e) => s + e.debit, 0);
  const totalPaid = ledger.reduce((s, e) => s + e.credit, 0);
  const outstanding = totalBilled - totalPaid;
  const orderCount = ledger.filter((e) => e.debit > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{customer.fullName}</h1>
          <p className="text-sm text-[var(--muted)]">
            {customer.customerNumber} · joined {format(customer.createdAt, "dd MMM yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/orders?customerId=${customer.id}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            New Order
          </Link>
          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded-xl bg-[var(--violet)]/10 px-4 py-2 text-sm font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
          >
            Edit
          </Link>
          <Link
            href="/customers"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
          >
            ← Customers
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--muted)]">Orders</p>
          <p className="mt-2 text-2xl font-semibold">{orderCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Total Billed</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalBilled)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Total Paid</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Outstanding</p>
          <p className={cn("mt-2 text-2xl font-semibold", outstanding > 0 ? "text-red-600" : "text-emerald-600")}>
            {formatCurrency(outstanding)}
          </p>
        </Card>
      </div>

      {/* Contact details */}
      <Card>
        <p className="mb-3 text-sm font-semibold">Details</p>
        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <p><span className="text-[var(--muted)]">Phone: </span>{customer.phone}</p>
          <p><span className="text-[var(--muted)]">Alt. phone: </span>{customer.alternativePhone ?? "—"}</p>
          <p><span className="text-[var(--muted)]">Email: </span>{customer.email ?? "—"}</p>
          <p><span className="text-[var(--muted)]">City: </span>{customer.city ?? "—"}</p>
          <p className="sm:col-span-2"><span className="text-[var(--muted)]">Address: </span>{customer.address ?? "—"}</p>
          {customer.notes && <p className="sm:col-span-2"><span className="text-[var(--muted)]">Notes: </span>{customer.notes}</p>}
        </div>
      </Card>

      {/* Ledger */}
      <Card>
        <p className="mb-4 text-sm font-semibold">Account history</p>
        <DataTable
          headers={["Date", "Description", "Billed", "Paid", "Balance"]}
          emptyMessage="No orders or payments yet."
        >
          {ledger.map((entry, i) => (
            <tr key={i} className="border-t border-[var(--border)]">
              <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{format(entry.date, "dd MMM yyyy")}</td>
              <td className="px-4 py-3">{entry.description}</td>
              <td className="px-4 py-3">{entry.debit > 0 ? formatCurrency(entry.debit) : "—"}</td>
              <td className="px-4 py-3 text-emerald-600">{entry.credit > 0 ? formatCurrency(entry.credit) : "—"}</td>
              <td className={cn("px-4 py-3 font-medium", entry.balance > 0 ? "text-red-600" : "")}>
                {formatCurrency(entry.balance)}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
