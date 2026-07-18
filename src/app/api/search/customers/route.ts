import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/guards";

/** Server-side customer search (phone-first). Returns at most 20 matches for the tenant. */
export async function GET(request: Request) {
  const session = await requireAuth();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const customers = await prisma.customer.findMany({
    where: {
      tenantId: session.tenantId,
      ...(q
        ? {
            OR: [
              { phone: { contains: q } },
              { fullName: { contains: q } },
              { customerNumber: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: q ? { fullName: "asc" } : { createdAt: "desc" },
    take: 20,
    select: { id: true, fullName: true, phone: true }
  });

  return NextResponse.json(
    customers.map((c) => ({ id: c.id, label: `${c.phone} · ${c.fullName}` }))
  );
}
