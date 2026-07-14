"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { ALL_PERMISSIONS, ROLE_PRESETS } from "@/lib/auth/permissions";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initialValues?: {
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    permissions: string[];
  };
  action: (formData: FormData) => Promise<void>;
};

const ROLE_OPTIONS = ["admin", "manager", "accountant", "tailor", "viewer"];

export function UserForm({ mode, initialValues, action }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState(initialValues?.role ?? "viewer");
  const [permissions, setPermissions] = useState<string[]>(initialValues?.permissions ?? ROLE_PRESETS.viewer);

  useEffect(() => {
    if (!initialValues) {
      setPermissions(ROLE_PRESETS[role] ?? ROLE_PRESETS.viewer);
    }
  }, [role, initialValues]);

  const permissionCount = useMemo(() => permissions.length, [permissions]);

  const toggle = (permission: string) => {
    setPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // keep the checked permissions in the form payload
    permissions.forEach((permission) => formData.append("permissions", permission));

    startTransition(async () => {
      try {
        await action(formData);
        toast.push(mode === "create" ? "User created" : "User updated");
        router.push("/users");
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to save user", "error");
      }
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Full name</label>
          <Input name="fullName" defaultValue={initialValues?.fullName ?? ""} placeholder="User full name" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Email</label>
          <Input name="email" type="email" defaultValue={initialValues?.email ?? ""} placeholder="user@example.com" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{mode === "create" ? "Password" : "New password"}</label>
          <Input
            name="password"
            type="password"
            placeholder={mode === "create" ? "At least 8 characters" : "Leave blank to keep current password"}
            required={mode === "create"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Role</label>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={initialValues?.isActive ?? true} className="h-4 w-4" />
        Active user
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Permissions</p>
            <p className="text-xs text-[var(--muted)]">{permissionCount} selected</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs"
            onClick={() => setPermissions(ROLE_PRESETS[role] ?? ROLE_PRESETS.viewer)}
          >
            Reset to role preset
          </button>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {ALL_PERMISSIONS.map((permission) => (
            <label key={permission} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={() => toggle(permission)}
                className="h-4 w-4"
              />
              <span>{permission}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create User" : "Save Changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
