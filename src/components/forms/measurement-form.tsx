"use client";

import { useState, useTransition } from "react";
import { createMeasurementProfileAction } from "@/app/(dashboard)/measurements/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toaster";

type Option = { id: string; label: string };

export function MeasurementForm({
  customers,
  garmentTypes
}: {
  customers: Option[];
  garmentTypes: Option[];
}) {
  const [customerId, setCustomerId]       = useState("");
  const [garmentTypeId, setGarmentTypeId] = useState("");
  const [name, setName]                   = useState("");
  const [notes, setNotes]                 = useState("");
  const [fields, setFields]               = useState("");
  const [isPending, startTransition]      = useTransition();
  const toast                             = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("customerId",    customerId);
        formData.set("garmentTypeId", garmentTypeId);
        formData.set("name",          name);
        formData.set("notes",         notes);
        formData.set("fields",        fields);
        await createMeasurementProfileAction(formData);
        toast.push("Measurement profile saved");
        setCustomerId(""); setGarmentTypeId(""); setName("");
        setNotes(""); setFields("");
      } catch (err) {
        toast.push(err instanceof Error ? err.message : "Failed to save profile", "error");
      }
    });
  };

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
      {/* Searchable customer dropdown */}
      <SearchableSelect
        value={customerId}
        onChange={setCustomerId}
        options={customers}
        placeholder="Select customer…"
      />

      {/* Garment type */}
      <Select
        value={garmentTypeId}
        onChange={(e) => setGarmentTypeId(e.target.value)}
        required
      >
        <option value="">Select garment type</option>
        {garmentTypes.map((gt) => (
          <option key={gt.id} value={gt.id}>{gt.label}</option>
        ))}
      </Select>

      <Input
        placeholder="Profile name (e.g., Suit Standard)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        placeholder="Measurement notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <textarea
        className="min-h-36 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm md:col-span-2 focus:border-[var(--primary)] focus:outline-none"
        placeholder={"Neck: 15\nShoulder: 18\nSleeve: 24\nChest: 40"}
        value={fields}
        onChange={(e) => setFields(e.target.value)}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save Profile"}
      </Button>
    </form>
  );
}
