import QRCode from "qrcode";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, toNumber, cn } from "@/lib/utils";
import { PrintButton } from "@/components/ui/print-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBusinessSettings } from "@/lib/settings";

const RESULT_LIMIT = 40;

export default async function ReceiptsPage({
  searchParams
}: {
  searchParams: Promise<{ orderId?: string; q?: string }>;
}) {
  const session = await requireAuth();
  const params  = await searchParams;
  const settings = await getBusinessSettings(session.tenantId);
  const q = params.q?.trim();

  // Server-side search (matches anywhere in name/phone/number) capped to a page of results,
  // so this scales to thousands of orders instead of loading them all into the browser.
  const orders = await prisma.order.findMany({
    where: {
      tenantId: session.tenantId,
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q } },
              { customer: { fullName: { contains: q } } },
              { customer: { customerNumber: { contains: q } } },
              { customer: { phone: { contains: q } } }
            ]
          }
        : {})
    },
    include: { customer: true },
    orderBy: { orderDate: "desc" },
    take: RESULT_LIMIT
  });

  const orderId = params.orderId ?? orders[0]?.id;

  const order = orderId
    ? await prisma.order.findFirst({
        where: { id: orderId, tenantId: session.tenantId },
        include: {
          customer: true,
          items:    { include: { garmentType: true } },
          payments: { include: { paymentMethod: true }, orderBy: { paymentDate: "asc" } }
        }
      })
    : null;

  const subtotal = order?.items.reduce((s, i) => s + i.quantity * toNumber(i.unitPrice), 0) ?? 0;
  const discount = toNumber(order?.discountAmount ?? 0);
  const total    = subtotal - discount;
  const paid     = order?.payments.reduce((s, p) => s + toNumber(p.amount), 0) ?? 0;
  const balance  = total - paid;

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const qrLink = order ? `${proto}://${host}/receipts?orderId=${order.id}` : "";

  const qr = order
    ? await QRCode.toDataURL(
        qrLink,
        {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 420,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        }
      )
    : null;

  function renderAmount(value: number) {
    const usd = <span>{formatCurrency(value)}</span>;

    if (!settings.multiCurrencyEnabled) {
      return usd;
    }

    const localValue = value * settings.exchangeRate;

    return (
      <span className="flex flex-col items-end leading-tight">
        <span>{formatCurrency(value)}</span>
        <span className="text-xs text-gray-400">{formatCurrency(localValue, settings.localCurrencyCode)}</span>
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Injected print CSS — overrides everything for this page */}
      <style>{`
        @media print {
          aside, header, .no-print, [data-no-print] {
            display: none !important;
            visibility: hidden !important;
          }
          main { padding: 0 !important; margin: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* ── Screen-only header & controls ── */}
      <div className="no-print print:hidden space-y-3" data-no-print="true">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Receipts</h1>
            <p className="text-sm text-[var(--muted)]">Search an order or customer, then print the receipt</p>
          </div>
          <PrintButton label="Print Receipt" />
        </div>

        <form method="get" className="flex gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by customer name, phone, or order number…"
            className="flex-1"
          />
          <Button type="submit">Search</Button>
        </form>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
          {orders.length === 0 ? (
            <p className="px-3 py-3 text-center text-sm text-[var(--muted)]">
              No orders match &ldquo;{q}&rdquo;. Try a different name or number.
            </p>
          ) : (
            <>
              <p className="px-3 py-1 text-xs text-[var(--muted)]">
                {q ? `${orders.length} match${orders.length !== 1 ? "es" : ""}` : "Recent orders"}
                {orders.length === RESULT_LIMIT ? " · showing first 40, refine to narrow" : ""}
              </p>
              <div className="max-h-56 overflow-auto">
                {orders.map((o) => (
                  <a
                    key={o.id}
                    href={`/receipts?orderId=${o.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    className={cn(
                      "block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--primary)]/10",
                      o.id === orderId && "bg-[var(--primary)]/10 font-semibold text-[var(--primary)]"
                    )}
                  >
                    <span className="font-mono text-xs">{o.orderNumber}</span> — {o.customer.fullName}
                    <span className="text-[var(--muted)]"> · {o.customer.phone}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Receipt (renders on-screen AND in print) ── */}
      {order ? (
        <div
          id="receipt"
          className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-8 text-gray-900 shadow-sm"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {/* Receipt header */}
          <div className="border-b-2 pb-4" style={{ borderColor: settings.brandColor }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                {settings.logoDataUrl ? (
                  <img
                    src={settings.logoDataUrl}
                    alt={settings.businessName}
                    className="max-h-18 max-w-48 object-contain"
                  />
                ) : (
                  <h2 className="text-3xl font-bold" style={{ color: settings.brandColor }}>
                    {settings.businessName}
                  </h2>
                )}
                <p className="text-sm text-gray-700">{settings.receiptSubtitle}</p>
                <p className="text-sm font-medium text-gray-700">{settings.receiptTopLine}</p>
                {settings.receiptFooter && (
                  <p className="whitespace-pre-line text-xs text-gray-600">{settings.receiptFooter}</p>
                )}
                <p className="text-xs text-gray-500">Receipt generated: {new Date().toLocaleDateString()}</p>
              </div>

              {qr && (
                <div className="flex justify-start md:justify-end">
                  <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
                    <img src={qr} alt="Receipt QR Code" className="h-36 w-36" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Customer</p>
                <p className="mt-1 font-bold text-lg">{order.customer.fullName}</p>
                <p className="text-gray-700">{order.customer.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Order</p>
                <p className="mt-1 font-bold text-lg font-mono">{order.orderNumber}</p>
                <p className="text-gray-700">{order.orderDate.toLocaleDateString()}</p>
                {order.deliveryDate && (
                  <p className="text-gray-700">Due: {order.deliveryDate.toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Garment items */}
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Items</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Garment</th>
                  <th className="pb-2 text-center font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Unit</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2">
                      {item.garmentType.name}
                      {item.fabric && <span className="text-gray-400"> · {item.fabric}</span>}
                      {item.color && <span className="text-gray-400">, {item.color}</span>}
                    </td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{renderAmount(toNumber(item.unitPrice))}</td>
                    <td className="py-2 text-right font-medium">
                      {renderAmount(item.quantity * toNumber(item.unitPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-1.5 border-t border-gray-200 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{renderAmount(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- {renderAmount(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{renderAmount(total)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Paid</span>
              <span>{renderAmount(paid)}</span>
            </div>
            <div
              className="flex justify-between text-base font-bold"
              style={{ color: balance > 0 ? settings.brandColor : "#15803d" }}
            >
              <span>Balance Due</span>
              <span>{renderAmount(balance)}</span>
            </div>
          </div>

          {/* Payment history */}
          {order.payments.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Payment History
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100">
                      <td className="py-1.5">{p.paymentDate.toLocaleDateString()}</td>
                      <td className="py-1.5">{p.paymentMethod.label}</td>
                      <td className="py-1.5 text-gray-400">{p.referenceNo ?? "—"}</td>
                      <td className="py-1.5 text-right font-medium text-green-700">
                        {renderAmount(toNumber(p.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer — business info now sits in the letterhead at the top */}
          <div className="mt-6 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
            <p>This receipt was generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <div className="no-print print:hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
          Select an order above to view its receipt.
        </div>
      )}
    </div>
  );
}
