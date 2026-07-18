import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/guards";

/** Measurement profiles for one customer (for the order form). Max 20, newest first. */
export async function GET(request: Request) {
  const session = await requireAuth();
  const customerId = new URL(request.url).searchParams.get("customerId")?.trim() ?? "";
  if (!customerId) return NextResponse.json([]);

  const profiles = await prisma.measurementProfile.findMany({
    where: { tenantId: session.tenantId, customerId },
    include: { garmentType: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json(
    profiles.map((p) => ({ id: p.id, label: `${p.name} · ${p.garmentType.name}` }))
  );
}
