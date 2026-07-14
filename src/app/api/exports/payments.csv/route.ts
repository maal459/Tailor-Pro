import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/guards";

export async function GET() {
  const session = await requireAuth();
  const payments = await prisma.payment.findMany({
    where: { tenantId: session.tenantId },
    include: { customer: true, order: true, paymentMethod: true },
    orderBy: { paymentDate: "desc" },
    take: 5000
  });

  const header = "payment_date,customer,order_number,amount,method,reference,notes";
  const rows = payments.map((payment) =>
    [
      payment.paymentDate.toISOString(),
      payment.customer.fullName,
      payment.order.orderNumber,
      toNumber(payment.amount),
      payment.paymentMethod.label,
      payment.referenceNo ?? "",
      payment.notes ?? ""
    ]
      .map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`)
      .join(",")
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=payments.csv"
    }
  });
}
