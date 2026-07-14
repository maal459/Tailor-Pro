import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { UserForm } from "@/components/forms/user-form";
import { requirePermission } from "@/lib/auth/guards";
import { userRepository, type UserRow } from "@/lib/repositories/user-repository";
import { updateUserAction } from "@/app/(dashboard)/users/actions";
import { getPermissionsForRole } from "@/lib/auth/permissions";

export default async function EditUserPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("users.manage");
  const { id } = await params;
  const user = await userRepository.detail(id, session.tenantId);

  if (!user) {
    notFound();
  }

  const userRecord = user as UserRow;
  const permissions = Array.isArray(userRecord.permissions) ? userRecord.permissions.map(String) : getPermissionsForRole(userRecord.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit User</h1>
        <p className="text-sm text-[var(--muted)]">Update role, active status, and permissions</p>
      </div>

      <Card>
        <UserForm
          mode="edit"
          initialValues={{
            fullName: user.fullName,
            email: user.email,
            role: userRecord.role,
            isActive: userRecord.isActive,
            permissions
          }}
          action={updateUserAction.bind(null, userRecord.id)}
        />
      </Card>
    </div>
  );
}
