import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildNotificationItems } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId },
    select: { notificationsSeenAt: true } as any
  }) as { notificationsSeenAt?: Date | null } | null;

  const data = await buildNotificationItems(session.tenantId, user?.notificationsSeenAt ?? null);
  return NextResponse.json({ ...data });
}
