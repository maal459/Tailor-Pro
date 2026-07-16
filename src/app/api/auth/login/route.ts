import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prismaUnsafe } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validators/auth";
import { createSession } from "@/lib/auth/session";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Brute-force guard: 15 attempts / 10 min per IP. Fails open when the IP is unknown,
  // so a missing proxy header can never lock legitimate users out.
  const ip = clientIp(request);
  if (ip && !rateLimit(`login:${ip}`, 15, 10 * 60 * 1000)) {
    return NextResponse.json(
      { message: "Too many login attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid credentials format" }, { status: 400 });
  }

  // Pre-tenant lookup: email is globally unique, so this resolves the user AND their
  // tenant. Uses the unguarded client because no tenant context exists yet.
  const user = await prismaUnsafe.user.findUnique({
    where: { email: parsed.data.email },
    include: { tenant: { select: { status: true } } }
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!isValidPassword) {
    return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  }

  if (user.tenant.status !== "ACTIVE") {
    return NextResponse.json(
      { message: "This business account is not active. Please contact support." },
      { status: 403 }
    );
  }

  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
    permissions: Array.isArray(user.permissions)
      ? user.permissions.map(String)
      : getPermissionsForRole(user.role),
    isSuperAdmin: user.isSuperAdmin
  });

  return NextResponse.json({ ok: true });
}
