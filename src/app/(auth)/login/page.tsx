"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@tailorpro.local",
      password: "admin12345"
    }
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
      setError(data.message ?? "Login failed");
      toast.push(data.message ?? "Login failed", "error");
      return;
    }

    toast.push("Logged in successfully");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Tailor Pro</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Secure sign in to continue</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Input placeholder="Email" type="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Input placeholder="Password" type="password" {...register("password")} />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
