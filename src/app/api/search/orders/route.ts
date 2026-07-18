import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/guards";

/** Server-side order search (by customer phone/name or order number). Max 20 matches. */
export async function GET(request: Request) {
  const session = await requireAuth();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const orders = await prisma.order.findMany({
    where: {
      tenantId: session.tenantId,
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q } },
              { customer: { phone: { contains: q } } },
              { customer: { fullName: { contains: q } } }
            ]
          }
        : {})
    },
    orderBy: { orderDate: "desc" },
    take: 20,
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      customer: { select: { fullName: true, phone: true } }
    }
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      customerId: o.customerId,
      label: `${o.customer.phone} · ${o.customer.fullName} · ${o.orderNumber}`
    }))
  );
}
