import { createCustomerAction } from "@/app/(dashboard)/customers/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { requireAuth } from "@/lib/auth/guards";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function CustomersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const query = params.q;

  const { rows, total } = await customerRepository.list(session.tenantId, query, page, 10);
  const pageCount = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-[var(--muted)]">Manage customer records and profiles</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/orders/history"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
          >
            Order History
          </a>
          <a
            href="/api/exports/customers.csv"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
          >
            Export CSV
          </a>
        </div>
      </div>

      <Card>
        <form className="grid gap-3 md:grid-cols-4" action={createCustomerAction}>
          <Input name="fullName" placeholder="Full name" required />
          <Input name="phone" placeholder="Phone" required />
          <Input name="email" placeholder="Email" type="email" />
          <Input name="city" placeholder="City" />
          <Input name="alternativePhone" placeholder="Alternative phone" />
          <Input name="address" placeholder="Address" />
          <Input name="notes" placeholder="Notes" className="md:col-span-2" />
          <Button type="submit">Add Customer</Button>
        </form>
      </Card>

      <Card>
        <form className="mb-4 flex gap-2" method="get">
          <Input name="q" placeholder="Search name, phone, customer number" defaultValue={query} />
          <Button variant="secondary" type="submit">
            Search
          </Button>
        </form>

        <DataTable
          headers={[
            "Customer #",
            "Name",
            "Phone",
            "City",
            "Orders",
            "Paid",
            "Outstanding"
          ]}
        >
          {rows.map((customer) => {
            const totalOrders = customer.orders.length;
            const paid = customer.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
            const orderAmount = customer.orders.reduce((sum, order) => {
              return (
                sum +
                order.items.reduce((itemSum, item) => itemSum + item.quantity * toNumber(item.unitPrice), 0) -
                toNumber(order.discountAmount)
              );
            }, 0);
            const outstanding = orderAmount - paid;

            return (
              <tr key={customer.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{customer.customerNumber}</td>
                <td className="px-4 py-3">{customer.fullName}</td>
                <td className="px-4 py-3">{customer.phone}</td>
                <td className="px-4 py-3">{customer.city ?? "-"}</td>
                <td className="px-4 py-3">{totalOrders}</td>
                <td className="px-4 py-3">{formatCurrency(paid)}</td>
                <td className="px-4 py-3">{formatCurrency(outstanding)}</td>
              </tr>
            );
          })}
        </DataTable>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p>
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            <a
              className="rounded-lg border px-3 py-1"
              href={`/customers?page=${Math.max(1, page - 1)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            >
              Prev
            </a>
            <a
              className="rounded-lg border px-3 py-1"
              href={`/customers?page=${Math.min(pageCount, page + 1)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            >
              Next
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
