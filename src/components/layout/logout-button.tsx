"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function LogoutButton() {
  const router = useRouter();
  const t = useT();

  return (
    <ConfirmButton
      label={t("Logout")}
      confirmText={t("Are you sure you want to logout?")}
      className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
      onConfirm={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    />
  );
}
