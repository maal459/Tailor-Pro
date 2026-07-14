import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const [customers, orders, payments] = q
    ? await Promise.all([
        prisma.customer.findMany({
          where: {
            tenantId: session.tenantId,
            OR: [
              { fullName: { contains: q } },
              { phone: { contains: q } },
              { customerNumber: { contains: q } }
            ]
          },
          take: 20
        }),
        prisma.order.findMany({
          where: {
            tenantId: session.tenantId,
            OR: [{ orderNumber: { contains: q } }, { customer: { fullName: { contains: q } } }]
          },
          include: { customer: true },
          take: 20
        }),
        prisma.payment.findMany({
          where: {
            tenantId: session.tenantId,
            OR: [{ referenceNo: { contains: q } }, { customer: { phone: { contains: q } } }]
          },
          include: { customer: true, order: true },
          take: 20
        })
      ])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global Search</h1>
        <p className="text-sm text-[var(--muted)]">Find customers, orders, and payments instantly</p>
      </div>

      <Card>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, phone, order #, payment reference"
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
          />
          <button className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm text-white">Search</button>
        </form>
      </Card>

      {!!q && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <h2 className="mb-2 font-semibold">Customers ({customers.length})</h2>
            <div className="space-y-2 text-sm">
              {customers.map((customer) => (
                <p key={customer.id} className="rounded-xl border p-2">
                  {customer.customerNumber} - {customer.fullName}
                </p>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Orders ({orders.length})</h2>
            <div className="space-y-2 text-sm">
              {orders.map((order) => (
                <p key={order.id} className="rounded-xl border p-2">
                  {order.orderNumber} - {order.customer.fullName}
                </p>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Payments ({payments.length})</h2>
            <div className="space-y-2 text-sm">
              {payments.map((payment) => (
                <p key={payment.id} className="rounded-xl border p-2">
                  {payment.customer.fullName} - {payment.order.orderNumber}
                </p>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
