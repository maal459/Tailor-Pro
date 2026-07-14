import { MeasurementForm } from "@/components/forms/measurement-form";
import { Card } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function MeasurementsPage() {
  const session = await requireAuth();

  const [customers, garmentTypes, profiles] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: session.tenantId }, orderBy: { fullName: "asc" } }),
    prisma.garmentType.findMany({ where: { tenantId: session.tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.measurementProfile.findMany({
      where: { tenantId: session.tenantId },
      include: { customer: true, garmentType: true, fields: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Measurements</h1>
        <p className="text-sm text-[var(--muted)]">Store and reuse profile-based measurements per garment</p>
      </div>

      <Card>
        <MeasurementForm
          customers={customers.map((c) => ({
            id: c.id,
            label: `${c.customerNumber} – ${c.fullName} (${c.phone})`
          }))}
          garmentTypes={garmentTypes.map((gt) => ({ id: gt.id, label: gt.name }))}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <p className="text-xs font-medium text-[var(--muted)]">{profile.customer.customerNumber}</p>
            <h3 className="mt-1 text-lg font-semibold">{profile.name}</h3>
            <p className="text-sm text-[var(--primary)]">{profile.garmentType.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {profile.fields.map((field) => (
                <p key={field.id}>
                  <span className="text-[var(--muted)]">{field.fieldName}:</span>{" "}
                  <span className="font-medium">{field.fieldValue}</span>
                </p>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
