"use client";

import { useState, useTransition } from "react";
import { createSalaryAction } from "@/app/(dashboard)/employees/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type EmployeeOption = { id: string; label: string; monthlySalary: number };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

export function SalaryForm({ employees }: { employees: EmployeeOption[] }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const now = new Date();
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [paymentDate, setPaymentDate] = useState(now.toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const selectEmployee = (id: string) => {
    setEmployeeId(id);
    const employee = employees.find((option) => option.id === id);
    if (employee) setAmount(employee.monthlySalary);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeId) {
      toast.push("Please select an employee", "error");
      return;
    }

    startTransition(async () => {
      try {
        await createSalaryAction({ employeeId, amount, paymentDate, month, year, notes });
        toast.push("Salary payment recorded");
        setEmployeeId("");
        setAmount(0);
        setNotes("");
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Failed to record salary", "error");
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Employee *">
        <Select value={employeeId} onChange={(e) => selectEmployee(e.target.value)} required>
          <option value="">Select employee…</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Amount ($) *">
        <Input
          type="number"
          min={0.01}
          step="0.01"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />
      </Field>

      <Field label="Payment Date *">
        <Input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
      </Field>

      <Field label="Salary Month *">
        <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Salary Year *">
        <Input
          type="number"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          required
        />
      </Field>

      <Field label="Notes">
        <Input
          placeholder="Optional notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Recording…" : "Record Salary Payment"}
        </Button>
      </div>
    </form>
  );
}
