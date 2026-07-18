import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { financeService } from "@/lib/services/finance-service";
import { formatCurrency } from "@/lib/utils";
import { PrintButton } from "@/components/ui/print-button";
import { CustomerHistorySelector } from "@/components/forms/customer-history-selector";

export default async function LedgerPage({
  searchParams
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const selectedCustomerId = params.customerId;
  const selectedCustomer = selectedCustomerId
    ? await prisma.customer.findFirst({
        where: { id: selectedCustomerId, tenantId: session.tenantId },
        select: { fullName: true, phone: true }
      })
    : null;
  const ledger = selectedCustomerId
    ? await financeService.customerLedger(session.tenantId, selectedCustomerId)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer Ledger</h1>
        <p className="text-sm text-[var(--muted)]">Complete debit/credit statement per customer</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <CustomerHistorySelector
            basePath="/ledger"
            selectedId={selectedCustomerId ?? ""}
            initialLabel={selectedCustomer ? `${selectedCustomer.phone} · ${selectedCustomer.fullName}` : ""}
          />
          <PrintButton />
        </div>
      </Card>

      <DataTable headers={["Date", "Description", "Debit", "Credit", "Balance"]}>
        {ledger.map((entry, index) => (
          <tr key={`${entry.description}-${index}`} className="border-t border-[var(--border)]">
            <td className="px-4 py-3">{entry.date.toDateString()}</td>
            <td className="px-4 py-3">{entry.description}</td>
            <td className="px-4 py-3">{formatCurrency(entry.debit)}</td>
            <td className="px-4 py-3">{formatCurrency(entry.credit)}</td>
            <td className="px-4 py-3 font-semibold">{formatCurrency(entry.balance)}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
