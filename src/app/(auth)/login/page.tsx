"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { useT } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const t = useT();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (values: LoginInput) => {
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      setError(t(data.message ?? "Login failed"));
      toast.push(t(data.message ?? "Login failed"), "error");
      return;
    }

    toast.push(t("Logged in successfully"));
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Tailor Pro</h1>
          <LanguageSwitcher />
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("Secure sign in to continue")}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Input placeholder={t("Email")} type="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{t(errors.email.message ?? "")}</p>}
          </div>
          <div>
            <Input placeholder={t("Password")} type="password" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{t(errors.password.message ?? "")}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("Signing in...") : t("Sign in")}
          </Button>
        </form>
      </div>
    </div>
  );
}
