import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/guards";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { updateCustomerAction } from "@/app/(dashboard)/customers/actions";

export default async function EditCustomerPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const customer = await customerRepository.byId(session.tenantId, id);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Customer</h1>
        <p className="text-sm text-[var(--muted)]">{customer.customerNumber}</p>
      </div>

      <Card>
        <form action={updateCustomerAction.bind(null, id)} className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Full name *</span>
            <Input name="fullName" defaultValue={customer.fullName} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Phone *</span>
            <Input name="phone" defaultValue={customer.phone} required />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Address</span>
            <Input name="address" defaultValue={customer.address || "Borama, Somaliland"} />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">Save Changes</Button>
            <Link
              href={`/customers/${id}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm hover:bg-black/5"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
