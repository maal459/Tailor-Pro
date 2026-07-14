import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/guards";

export async function GET() {
  const session = await requireAuth();
  const customers = await prisma.customer.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 5000
  });
  const header = "customer_number,full_name,phone,email,city,created_at";
  const rows = customers.map((customer) =>
    [
      customer.customerNumber,
      customer.fullName,
      customer.phone,
      customer.email ?? "",
      customer.city ?? "",
      customer.createdAt.toISOString()
    ]
      .map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`)
      .join(",")
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=customers.csv"
    }
  });
}
