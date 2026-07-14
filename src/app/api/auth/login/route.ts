import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prismaUnsafe } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validators/auth";
import { createSession } from "@/lib/auth/session";
import { getPermissionsForRole } from "@/lib/auth/permissions";

export async function POST(request: Request) {
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
