"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import { createTenantAction, updateTenantAction } from "@/app/platform/tenants/actions";

const PLANS = ["FREE", "BASIC", "PRO", "ENTERPRISE"] as const;
const STATUSES = ["ACTIVE", "SUSPENDED", "CANCELLED"] as const;

type CreateValues = {
  businessName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  subscriptionPlan: string;
};

type EditValues = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  subscriptionPlan: string;
  status: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function TenantForm(
  props:
    | { mode: "create" }
    | { mode: "edit"; tenantId: string; initial: EditValues }
) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [create, setCreate] = useState<CreateValues>({
    businessName: "",
    slug: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
    subscriptionPlan: "FREE"
  });
  const [edit, setEdit] = useState<EditValues>(
    props.mode === "edit"
      ? props.initial
      : { businessName: "", ownerName: "", email: "", phone: "", address: "", subscriptionPlan: "FREE", status: "ACTIVE" }
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        if (props.mode === "create") {
          await createTenantAction(create);
          toast.push("Tenant created");
        } else {
          await updateTenantAction(props.tenantId, edit);
          toast.push("Tenant updated");
        }
        router.push("/platform/tenants");
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to save tenant", "error");
      }
    });
  };

  if (props.mode === "create") {
    return (
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Field label="Business Name *">
          <Input
            value={create.businessName}
            onChange={(e) =>
              setCreate((p) => ({
                ...p,
                businessName: e.target.value,
                slug: p.slug || slugify(e.target.value)
              }))
            }
            required
          />
        </Field>
        <Field label="Slug * (unique, lowercase)">
          <Input
            value={create.slug}
            onChange={(e) => setCreate((p) => ({ ...p, slug: slugify(e.target.value) }))}
            placeholder="style-tailors"
            required
          />
        </Field>
        <Field label="Owner Name">
          <Input value={create.ownerName} onChange={(e) => setCreate((p) => ({ ...p, ownerName: e.target.value }))} />
        </Field>
        <Field label="Owner Email * (login)">
          <Input
            type="email"
            value={create.ownerEmail}
            onChange={(e) => setCreate((p) => ({ ...p, ownerEmail: e.target.value }))}
            required
          />
        </Field>
        <Field label="Owner Password * (min 8)">
          <Input
            type="password"
            value={create.password}
            onChange={(e) => setCreate((p) => ({ ...p, password: e.target.value }))}
            required
          />
        </Field>
        <Field label="Subscription Plan">
          <Select
            value={create.subscriptionPlan}
            onChange={(e) => setCreate((p) => ({ ...p, subscriptionPlan: e.target.value }))}
          >
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create Tenant"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <Field label="Business Name *">
        <Input value={edit.businessName} onChange={(e) => setEdit((p) => ({ ...p, businessName: e.target.value }))} required />
      </Field>
      <Field label="Owner Name">
        <Input value={edit.ownerName} onChange={(e) => setEdit((p) => ({ ...p, ownerName: e.target.value }))} />
      </Field>
      <Field label="Contact Email">
        <Input type="email" value={edit.email} onChange={(e) => setEdit((p) => ({ ...p, email: e.target.value }))} />
      </Field>
      <Field label="Phone">
        <Input value={edit.phone} onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))} />
      </Field>
      <Field label="Address">
        <Input value={edit.address} onChange={(e) => setEdit((p) => ({ ...p, address: e.target.value }))} />
      </Field>
      <Field label="Subscription Plan">
        <Select value={edit.subscriptionPlan} onChange={(e) => setEdit((p) => ({ ...p, subscriptionPlan: e.target.value }))}>
          {PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={edit.status} onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value }))}>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Field>
      <div className="md:col-span-2 flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/platform/tenants")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
