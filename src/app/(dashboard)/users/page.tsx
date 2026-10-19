import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { UserForm } from "@/components/forms/user-form";
import { requirePermission } from "@/lib/auth/guards";
import { userRepository, type UserRow } from "@/lib/repositories/user-repository";
import { createUserAction, deleteUserAction } from "@/app/(dashboard)/users/actions";
import { getT } from "@/lib/i18n/server";

export default async function UsersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePermission("users.manage");
  const params = await searchParams;
  const t = await getT();
  const q = params.q?.trim();
  const page = Number(params.page ?? "1");

  const { rows, total } = await userRepository.list(session.tenantId, q, page, 10);
  const pageCount = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{t("User Management")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("Add users, edit roles, and control permissions")}</p>
        </div>
      </div>

      <Card>
        <p className="mb-4 text-sm font-semibold">{t("Create User")}</p>
        <UserForm mode="create" action={createUserAction} />
      </Card>

      <Card>
        <form className="mb-4 flex gap-2" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder={t("Search name, email, or role")}
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
          />
          <button className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm text-white">{t("Search")}</button>
        </form>

        <DataTable headers={["Name", "Email", "Role", "Permissions", "Status", "Created", "Actions"]} emptyMessage="No users found.">
          {(rows as UserRow[]).map((user) => (
            <tr key={user.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-3 font-medium">{user.fullName}</td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3">{t(user.role)}</td>
              <td className="px-4 py-3">{Array.isArray(user.permissions) ? user.permissions.length : 0}</td>
              <td className="px-4 py-3">{user.isActive ? t("Active") : t("Inactive")}</td>
              <td className="px-4 py-3">{user.createdAt.toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link
                    href={`/users/${user.id}/edit`}
                    className="rounded-lg bg-[var(--violet)]/10 px-2 py-1 text-xs font-medium text-[var(--violet)] hover:bg-[var(--violet)]/20"
                  >
                    {t("Edit")}
                  </Link>
                  {user.id !== session.userId && (
                    <ActionButton
                      label={t("Delete")}
                      confirmText={t("Delete user \"{name}\"?", { name: user.fullName })}
                      action={deleteUserAction.bind(null, user.id)}
                      successMessage={t("User deleted")}
                      className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20"
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p>
            {t("Page {page} of {pages}", { page, pages: pageCount })}
          </p>
          <div className="flex gap-2">
            <a className="rounded-lg border px-3 py-1" href={`/users?page=${Math.max(1, page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>
              {t("Prev")}
            </a>
            <a className="rounded-lg border px-3 py-1" href={`/users?page=${Math.min(pageCount, page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>
              {t("Next")}
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
