"use client";

import { useRef, useTransition } from "react";
import { createCustomerAction } from "@/app/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";

export function CustomerForm() {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await createCustomerAction(formData);
        if (result.ok) {
          toast.push("Customer added");
          formRef.current?.reset();
        } else {
          toast.push(result.error, "error");
        }
      } catch {
        toast.push("Could not save the customer. Please try again.", "error");
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-3 md:grid-cols-3">
      <Input name="fullName" placeholder="Full name" required minLength={2} />
      <Input name="phone" placeholder="Phone" required minLength={5} />
      <Input name="address" placeholder="Address" defaultValue="Borama, Somaliland" />
      <Button type="submit" disabled={isPending} className="md:col-span-3 md:w-fit">
        {isPending ? "Saving…" : "Add Customer"}
      </Button>
    </form>
  );
}
