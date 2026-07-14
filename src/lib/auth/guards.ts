import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { type Permission, getPermissionsForRole, hasPermission } from "@/lib/auth/permissions";

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();

  // Authorize against the database, not the session token: permission edits
  // (and newly introduced permissions) apply without waiting out the 7-day JWT.
  // Scoped by tenantId so a user can only ever resolve within their own tenant.
  const user = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId },
    select: { role: true, permissions: true, isActive: true }
  });

  const storedPermissions =
    user && Array.isArray(user.permissions) ? user.permissions.map(String) : [];
  const effectivePermissions = storedPermissions.length
    ? storedPermissions
    : getPermissionsForRole(user?.role ?? session.role);

  if (!user?.isActive || !hasPermission(effectivePermissions, permission)) {
    redirect("/dashboard");
  }
  return session;
}

/**
 * Platform-owner gate. Super-admin is a platform-level flag orthogonal to tenant
 * roles — a tenant `admin` is NOT a super-admin. Checked against the DB (not just
 * the JWT) so a promotion/demotion takes effect without waiting out the session.
 */
export async function requireSuperAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId },
    select: { isActive: true, isSuperAdmin: true }
  });
  if (!user?.isActive || !user.isSuperAdmin) {
    redirect("/dashboard");
  }
  return session;
}

/** Cheap boolean form for conditionally rendering platform navigation. */
export async function currentUserIsSuperAdmin() {
  const session = await getSession();
  if (!session) return false;
  const user = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId },
    select: { isSuperAdmin: true }
  });
  return !!user?.isSuperAdmin;
}
