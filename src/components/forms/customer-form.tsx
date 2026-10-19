"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomerAction } from "@/app/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { useT } from "@/lib/i18n/client";

export function CustomerForm() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await createCustomerAction(formData);
        if (result.ok) {
          toast.push(t("Customer added"));
          formRef.current?.reset();
          // Re-fetch the list so the new row shows even if the action response did not carry it.
          router.refresh();
        } else {
          toast.push(result.error, "error");
        }
      } catch {
        toast.push(t("Could not save the customer. Please try again."), "error");
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-3 md:grid-cols-3">
      <Input name="fullName" placeholder={t("Full name")} required minLength={2} />
      <Input name="phone" placeholder={t("Phone")} required minLength={5} />
      <Input name="address" placeholder={t("Address")} defaultValue="Borama, Somaliland" />
      <Button type="submit" disabled={isPending} className="md:col-span-3 md:w-fit">
        {isPending ? t("Saving…") : t("Add Customer")}
      </Button>
    </form>
  );
}
