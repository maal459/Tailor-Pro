/**
 * Migrate a legacy phpMyAdmin "new-db-lebbis" tailor database into a Lebbis tenant.
 *
 * Source of truth in the legacy DB:
 *   - customers            -> Customer
 *   - payments (the sales ledger: customer+garment+price+paid+dates) -> Order + OrderItem (+ Payment when Paid>0)
 *   - distinct garment names in payments -> GarmentType
 *   - expenses (amount>0)  -> Expense
 *   - staff                -> Employee
 *   - supplier             -> Supplier
 * (The legacy `orders` table is freeform measurement text that doesn't reliably join to
 *  sales — left for a phase-2 enrichment.)
 *
 * Idempotent: every row gets a deterministic id derived from (tenant, kind, legacy key),
 * inserted with skipDuplicates, so re-running is safe.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy.ts <tenant-slug> [--commit] [--legacy-db=legacy_lebbis]
 *
 *   (default is a DRY RUN that only reports counts; pass --commit to write.)
 */
import { readFileSync } from "fs";
import { createHash } from "crypto";
import mysql from "mysql2/promise";
import { prismaUnsafe } from "@/lib/db/prisma";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
const LEGACY_DB = (args.find((a) => a.startsWith("--legacy-db="))?.split("=")[1]) ?? "legacy_lebbis";

if (!slug) {
  console.error("Usage: npx tsx scripts/migrate-legacy.ts <tenant-slug> [--commit] [--legacy-db=legacy_lebbis]");
  process.exit(1);
}

function legacyCfg() {
  const env = readFileSync(".env", "utf8");
  const line = env.split(/\r?\n/).find((l) => l.trim().startsWith("DATABASE_URL"))!;
  const raw = line.replace(/^\s*DATABASE_URL\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
  const u = new URL(raw);
  return {
    host: u.hostname, port: Number(u.port || 3306),
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: LEGACY_DB, dateStrings: true as const
  };
}

/** Treat a "YYYY-MM-DD HH:MM:SS" legacy string as a literal calendar date (UTC). */
function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim().replace(" ", "T");
  const d = new Date(`${s}Z`);
  return Number.isNaN(d.valueOf()) ? null : d;
}
function cleanStr(v: unknown, max = 250): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const tenant = await prismaUnsafe.tenant.findFirst({ where: { OR: [{ slug }, { id: slug }] } });
  if (!tenant) throw new Error(`No tenant with slug/id "${slug}". Create the tenant first.`);
  const tenantId = tenant.id;
  const id = (kind: string, key: string | number) =>
    "lg" + createHash("sha1").update(`${tenantId}|${kind}|${key}`).digest("hex").slice(0, 23);

  console.log(`Target tenant: "${tenant.businessName}" (${tenantId})  mode: ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);

  const legacy = await mysql.createConnection(legacyCfg());
  const rows = async <T = any>(sql: string) => (await legacy.query<any[]>(sql))[0] as T[];

  // ---- 1. Payment method (CASH) ----
  let cashMethodId = "";
  const existingMethod = await prismaUnsafe.paymentMethod.findFirst({ where: { tenantId, code: "CASH" } });
  cashMethodId = existingMethod?.id ?? id("pm", "CASH");
  if (COMMIT && !existingMethod) {
    await prismaUnsafe.paymentMethod.create({ data: { id: cashMethodId, tenantId, code: "CASH", label: "Cash" } });
  }

  // ---- 2. Garment types (from distinct payment garment names) ----
  // Reuse existing garment types (provisioning defaults + prior runs) so a legacy name that
  // matches an existing one (case-insensitively, e.g. "suit" vs "Suit") maps to the real id
  // instead of a duplicate that MySQL INSERT IGNORE would drop — which would orphan its items.
  const existingGarments = await prismaUnsafe.garmentType.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const existingByName = new Map(existingGarments.map((g) => [g.name.toLowerCase(), g.id]));
  const garmentRows = await rows("SELECT DISTINCT Services_Name s FROM payments");
  const garmentMap = new Map<string, string>(); // cleanKey -> garmentId
  const garmentInserts: any[] = [];
  const OTHER = "Other";
  for (const gr of [...garmentRows, { s: OTHER }]) {
    const name = cleanStr(gr.s, 100);
    if (!name) continue;
    const key = name.toLowerCase();
    if (garmentMap.has(key)) continue;
    const reuse = existingByName.get(key);
    if (reuse) { garmentMap.set(key, reuse); continue; }
    const gid = id("garment", key);
    garmentMap.set(key, gid);
    garmentInserts.push({ id: gid, tenantId, name });
  }
  const garmentIdFor = (raw: unknown) => {
    const name = cleanStr(raw, 100);
    return garmentMap.get((name ?? OTHER).toLowerCase()) ?? garmentMap.get(OTHER.toLowerCase())!;
  };

  // ---- 3. Customers ----
  const custRows = await rows("SELECT Customer_ID, customercode, Customer_Name, Customer_Contact, `date` FROM customers");
  const custMap = new Map<number, string>(); // oldId -> newId
  const custInserts: any[] = [];
  const seenCode = new Set<string>();
  for (const r of custRows) {
    const cid = id("cust", r.Customer_ID);
    custMap.set(Number(r.Customer_ID), cid);
    let code = cleanStr(r.customercode, 40) ?? `LEG-${r.Customer_ID}`;
    if (seenCode.has(code)) code = `${code}-${r.Customer_ID}`;
    seenCode.add(code);
    custInserts.push({
      id: cid, tenantId, customerNumber: code,
      fullName: cleanStr(r.Customer_Name, 150) ?? "Unknown",
      phone: cleanStr(r.Customer_Contact, 30) ?? "-",
      createdAt: parseDate(r.date) ?? new Date("2021-01-01Z"),
      updatedAt: new Date()
    });
  }

  // ---- 4. Orders + OrderItems + Payments (from payments ledger) ----
  const payRows = await rows(
    "SELECT ID, Payment_ID, Services_Name, Service_Price, Discount, Paid, Remaining, `Date`, Delivery_Date FROM payments"
  );
  const orderInserts: any[] = [];
  const itemInserts: any[] = [];
  const paymentInserts: any[] = [];
  let skippedOrphan = 0;
  for (const r of payRows) {
    const customerId = custMap.get(Number(r.Payment_ID));
    if (!customerId) { skippedOrphan++; continue; }
    const oid = id("order", r.ID);
    const price = num(r.Service_Price) > 0 ? num(r.Service_Price) : num(r.Paid) + num(r.Remaining);
    const orderDate = parseDate(r.Date) ?? new Date("2021-01-01Z");
    const status = num(r.Remaining) <= 0 ? "DELIVERED" : "READY";
    orderInserts.push({
      id: oid, tenantId, orderNumber: `LEG-${r.ID}`, customerId,
      orderDate, deliveryDate: parseDate(r.Delivery_Date),
      status, priority: "NORMAL",
      discountAmount: num(r.Discount),
      notes: "Imported from legacy system", createdAt: orderDate, updatedAt: new Date()
    });
    itemInserts.push({
      id: id("oitem", r.ID), tenantId, orderId: oid,
      garmentTypeId: garmentIdFor(r.Services_Name), quantity: 1, unitPrice: price,
      createdAt: orderDate
    });
    if (num(r.Paid) > 0) {
      paymentInserts.push({
        id: id("pay", r.ID), tenantId, orderId: oid, customerId,
        paymentMethodId: cashMethodId, amount: num(r.Paid),
        paymentDate: orderDate, referenceNo: `LEG-${r.ID}`, createdAt: orderDate
      });
    }
  }

  // ---- 5. Expenses (amount>0) ----
  const expRows = await rows(
    "SELECT ExpenID, ExpensesType, `Date`, Money_Amount, ModeOfPayment, PaidTo, ContactNumber FROM expenses WHERE Money_Amount>0"
  );
  const expInserts: any[] = expRows.map((r, i) => ({
    id: id("exp", `${r.ExpenID}-${i}`), tenantId,
    title: cleanStr(r.ExpensesType, 150) ?? "Expense",
    amount: num(r.Money_Amount),
    expenseDate: parseDate(r.Date) ?? new Date("2021-01-01Z"),
    notes: [cleanStr(r.PaidTo), cleanStr(r.ModeOfPayment), cleanStr(r.ContactNumber)].filter(Boolean).join(" · ") || null,
    createdAt: parseDate(r.Date) ?? new Date("2021-01-01Z"), updatedAt: new Date()
  }));

  // ---- 6. Employees (staff) + Suppliers ----
  const staffRows = await rows("SELECT Staff_ID, Staff_Name, Staff_Contact FROM staff");
  const empInserts = staffRows
    .filter((r) => cleanStr(r.Staff_Name))
    .map((r) => ({
      id: id("emp", r.Staff_ID), tenantId, fullName: cleanStr(r.Staff_Name, 150)!,
      phone: cleanStr(r.Staff_Contact, 30), monthlySalary: 0, createdAt: new Date(), updatedAt: new Date()
    }));
  const supRows = await rows("SELECT supplier_id, supplier_name, supplier_address, supplier_contact FROM supplier");
  const supInserts = supRows
    .filter((r) => cleanStr(r.supplier_name))
    .map((r) => ({
      id: id("sup", r.supplier_id), tenantId, supplierName: cleanStr(r.supplier_name, 150)!,
      address: cleanStr(r.supplier_address, 255), phone: cleanStr(r.supplier_contact, 30),
      createdAt: new Date(), updatedAt: new Date()
    }));

  await legacy.end();

  // ---- Report ----
  console.log("Planned migration:");
  console.log(`  GarmentTypes : ${garmentInserts.length}`);
  console.log(`  Customers    : ${custInserts.length}`);
  console.log(`  Orders       : ${orderInserts.length}   (skipped orphans: ${skippedOrphan})`);
  console.log(`  OrderItems   : ${itemInserts.length}`);
  console.log(`  Payments     : ${paymentInserts.length}`);
  console.log(`  Expenses     : ${expInserts.length}`);
  console.log(`  Employees    : ${empInserts.length}`);
  console.log(`  Suppliers    : ${supInserts.length}`);

  if (!COMMIT) {
    console.log("\nDRY RUN — nothing written. Re-run with --commit to apply.");
    return;
  }

  const chunk = async (label: string, model: any, data: any[]) => {
    let done = 0;
    for (let i = 0; i < data.length; i += 1000) {
      const res = await model.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
      done += res.count;
    }
    console.log(`  ✓ ${label}: +${done} (of ${data.length})`);
  };

  console.log("\nWriting…");
  await chunk("GarmentTypes", prismaUnsafe.garmentType, garmentInserts);
  await chunk("Customers", prismaUnsafe.customer, custInserts);
  await chunk("Orders", prismaUnsafe.order, orderInserts);
  await chunk("OrderItems", prismaUnsafe.orderItem, itemInserts);
  await chunk("Payments", prismaUnsafe.payment, paymentInserts);
  await chunk("Expenses", prismaUnsafe.expense, expInserts);
  await chunk("Employees", prismaUnsafe.employee, empInserts);
  await chunk("Suppliers", prismaUnsafe.supplier, supInserts);
  console.log("\n✓ Migration complete.");
}

main()
  .catch((e) => { console.error("✗", e instanceof Error ? e.stack : e); process.exit(1); })
  .finally(async () => { await prismaUnsafe.$disconnect(); });
