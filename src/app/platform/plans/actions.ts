"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prismaUnsafe } from "@/lib/db/prisma";
import { logActivity } from "@/lib/activity-log";
import { planPriceSchema } from "@/lib/validators/billing";
import { CURRENCY } from "@/lib/billing/plans";

export async function updatePlanPriceAction(input: unknown) {
  const session = await requireSuperAdmin();

  const parsed = planPriceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid plan price");
  }

  const { plan, monthlyPrice, yearlyPrice, isActive } = parsed.data;

  // Upsert: editing a plan that only had a code-default now persists an editable row.
  await prismaUnsafe.planPrice.upsert({
    where: { plan },
    create: { plan, monthlyPrice, yearlyPrice, currency: CURRENCY, isActive },
    update: { monthlyPrice, yearlyPrice, isActive }
  });

  await logActivity({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityType: "PlanPrice",
    entityId: plan,
    action: "update",
    message: `Plan ${plan} priced at ${CURRENCY} ${monthlyPrice}/mo, ${CURRENCY} ${yearlyPrice}/yr by ${session.email}`
  });

  revalidatePath("/platform/plans");
  revalidatePath("/platform/finance");
}
