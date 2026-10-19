"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useT } from "@/lib/i18n/client";

const BRAND_COLORS = ["#E6652E", "#4B3BCF", "#32B56B", "#F2C53D", "#35B8E8", "#E8855C", "#7B70E8"];

export function RevenueChart({ data }: { data: Array<{ name: string; revenue: number }> }) {
  const t = useT();
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12
            }}
          />
          <Bar dataKey="revenue" name={t("Revenue")} fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ data }: { data: Array<{ status: string; count: number }> }) {
  const t = useT();
  const translated = data.map((entry) => ({ ...entry, label: t(entry.status) }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={translated} dataKey="count" nameKey="label" outerRadius={85} label>
            {translated.map((entry, index) => (
              <Cell key={entry.status} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
