import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";

export type ReceivableRow = {
  id: string;
  customerNumber: string;
  fullName: string;
  phone: string;
  billed: number;
  paid: number;
  balance: number;
  lastOrder: Date | null;
};

/**
 * Per-customer outstanding balance = billed (order items − discounts) − paid, over a date
 * range. Raw SQL because it aggregates Order + OrderItem + Payment per customer, which is
 * far cheaper than pulling thousands of rows into Node. `$queryRawUnsafe` uses positional
 * `?` params (no interpolation), and tenantId is filtered explicitly in every subquery.
 */
const INNER = `
  SELECT c.id, c.customerNumber, c.fullName, c.phone,
    (COALESCE(it.itemsTotal, 0) - COALESCE(od.discTotal, 0)) AS billed,
    COALESCE(py.paid, 0) AS paid,
    (COALESCE(it.itemsTotal, 0) - COALESCE(od.discTotal, 0) - COALESCE(py.paid, 0)) AS balance,
    od.lastOrder AS lastOrder
  FROM \`Customer\` c
  LEFT JOIN (
    SELECT o.customerId AS cid, SUM(oi.quantity * oi.unitPrice) AS itemsTotal
    FROM \`Order\` o JOIN \`OrderItem\` oi ON oi.orderId = o.id
    WHERE o.tenantId = ? AND o.orderDate BETWEEN ? AND ?
    GROUP BY o.customerId
  ) it ON it.cid = c.id
  LEFT JOIN (
    SELECT customerId AS cid, SUM(discountAmount) AS discTotal, MAX(orderDate) AS lastOrder
    FROM \`Order\` WHERE tenantId = ? AND orderDate BETWEEN ? AND ?
    GROUP BY customerId
  ) od ON od.cid = c.id
  LEFT JOIN (
    SELECT customerId AS cid, SUM(amount) AS paid
    FROM \`Payment\` WHERE tenantId = ? AND paymentDate BETWEEN ? AND ?
    GROUP BY customerId
  ) py ON py.cid = c.id
  WHERE c.tenantId = ?
    AND (? = '' OR c.fullName LIKE ? OR c.phone LIKE ? OR c.customerNumber LIKE ?)
  HAVING balance > 0.009
`;

export async function getReceivables(
  tenantId: string,
  opts: { from: Date; to: Date; q?: string; limit?: number }
): Promise<{ rows: ReceivableRow[]; totalOutstanding: number; customerCount: number }> {
  const q = opts.q?.trim() ?? "";
  const like = `%${q}%`;
  // Only the top rows are returned; the total/count row aggregates the FULL set in SQL,
  // so the bottom-line figure is always complete regardless of the display limit.
  const limit = opts.limit ?? 20;
  const params = [
    tenantId, opts.from, opts.to,
    tenantId, opts.from, opts.to,
    tenantId, opts.from, opts.to,
    tenantId,
    q, like, like, like
  ];

  const [listRaw, totalRaw] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`${INNER} ORDER BY balance DESC LIMIT ?`, ...params, limit),
    prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(t.balance), 0) AS total FROM (${INNER}) t`,
      ...params
    )
  ]);

  const rows: ReceivableRow[] = listRaw.map((r) => ({
    id: r.id,
    customerNumber: r.customerNumber,
    fullName: r.fullName,
    phone: r.phone,
    billed: toNumber(r.billed),
    paid: toNumber(r.paid),
    balance: toNumber(r.balance),
    lastOrder: r.lastOrder ? new Date(r.lastOrder) : null
  }));

  return {
    rows,
    totalOutstanding: toNumber(totalRaw[0]?.total ?? 0),
    customerCount: Number(totalRaw[0]?.cnt ?? 0)
  };
}
