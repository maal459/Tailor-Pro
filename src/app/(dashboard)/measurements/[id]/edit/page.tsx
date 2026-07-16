import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { updateMeasurementProfileAction } from "@/app/(dashboard)/measurements/actions";

export default async function EditMeasurementPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const [profile, garmentTypes] = await Promise.all([
    prisma.measurementProfile.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { customer: true, fields: true }
    }),
    prisma.garmentType.findMany({
      where: { tenantId: session.tenantId, isActive: true },
      orderBy: { name: "asc" }
    })
  ]);
  if (!profile) notFound();

  const fieldsText = profile.fields.map((f) => `${f.fieldName}: ${f.fieldValue}`).join("\n");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Measurement Profile</h1>
        <p className="text-sm text-[var(--muted)]">
          {profile.customer.customerNumber} · {profile.customer.fullName}
        </p>
      </div>

      <Card>
        <form action={updateMeasurementProfileAction.bind(null, id)} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Profile name *</span>
            <Input name="name" defaultValue={profile.name} required />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Garment type</span>
            <Select name="garmentTypeId" defaultValue={profile.garmentTypeId}>
              {garmentTypes.map((gt) => (
                <option key={gt.id} value={gt.id}>{gt.name}</option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Measurements (one per line, e.g. "Chest: 40")</span>
            <textarea
              name="fields"
              defaultValue={fieldsText}
              rows={8}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Notes</span>
            <Input name="notes" defaultValue={profile.notes ?? ""} />
          </label>
          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Link
              href="/measurements"
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
