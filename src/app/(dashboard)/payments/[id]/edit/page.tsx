import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EditPaymentForm } from "@/components/forms/edit-payment-form";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";

export default async function EditPaymentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session   = await requireAuth();
  const { id }    = await params;

  const [payment, methods] = await Promise.all([
    prisma.payment.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { order: true, customer: true, paymentMethod: true }
    }),
    prisma.paymentMethod.findMany({
      where: { tenantId: session.tenantId, isActive: true }
    })
  ]);

  if (!payment || payment.tenantId !== session.tenantId) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Payment</h1>
        <p className="text-sm text-[var(--muted)]">
          {payment.customer.fullName} · {payment.paymentDate.toLocaleDateString()}
        </p>
      </div>

      <Card>
        <EditPaymentForm
          paymentId={id}
          orderId={payment.orderId}
          orderLabel={`${payment.order.orderNumber} — ${payment.customer.fullName}`}
          defaultAmount={toNumber(payment.amount)}
          defaultMethod={payment.paymentMethodId}
          defaultRef={payment.referenceNo ?? ""}
          defaultNotes={payment.notes ?? ""}
          paymentMethods={methods.map((m) => ({ id: m.id, label: m.label }))}
        />
      </Card>
    </div>
  );
}
