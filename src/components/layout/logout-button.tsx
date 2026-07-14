"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function LogoutButton() {
  const router = useRouter();

  return (
    <ConfirmButton
      label="Logout"
      confirmText="Are you sure you want to logout?"
      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
      onConfirm={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    />
  );
}
