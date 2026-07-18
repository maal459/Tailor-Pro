import Link from "next/link";
import { MeasurementForm } from "@/components/forms/measurement-form";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { deleteMeasurementProfileAction } from "@/app/(dashboard)/measurements/actions";

export default async function MeasurementsPage() {
  const session = await requireAuth();

  const [garmentTypes, profiles] = await Promise.all([
    prisma.garmentType.findMany({ where: { tenantId: session.tenantId, isActive: true }, orderBy: { name: "asc" } }),
    // Latest 20 only — a specific customer's profiles are reached via their customer page.
    prisma.measurementProfile.findMany({
      where: { tenantId: session.tenantId },
      include: { customer: true, garmentType: true, fields: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Measurements</h1>
        <p className="text-sm text-[var(--muted)]">
          Store and reuse profile-based measurements per garment · showing the 20 most recent
        </p>
      </div>

      <Card>
        <MeasurementForm
          garmentTypes={garmentTypes.map((gt) => ({ id: gt.id, label: gt.name }))}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[var(--muted)]">
                  {profile.customer.customerNumber} · {profile.customer.fullName}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{profile.name}</h3>
                <p className="text-sm text-[var(--primary)]">{profile.garmentType.name}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Link
                  href={`/measurements/${profile.id}/edit`}
                  className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                >
                  Edit
                </Link>
                <ActionButton
                  label="Delete"
                  confirmText={`Delete measurement profile "${profile.name}"?`}
                  action={deleteMeasurementProfileAction.bind(null, profile.id)}
                  successMessage="Profile deleted"
                  className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20"
                />
              </div>
            </div>
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
