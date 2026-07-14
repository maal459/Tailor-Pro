import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await prisma.user.updateMany({
    where: { id: session.userId, tenantId: session.tenantId },
    data: { notificationsSeenAt: new Date() } as any
  });

  return NextResponse.json({ ok: true });
}
