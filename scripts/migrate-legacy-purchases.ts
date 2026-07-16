/**
 * Phase 2 of the legacy migration: products, product categories, and purchases.
 * Run AFTER migrate-legacy.ts (needs the tenant's suppliers/categories to exist) and after
 * import-legacy-dump.ts has loaded the temp `legacy_lebbis` DB.
 *
 * Legacy sources:
 *   - product (fabric codes) + codes referenced in purchase -> Product (sku "LG-<code>")
 *   - distinct purchase.category_name                       -> ProductCategory
 *   - purchase                                              -> Purchase + PurchaseItem
 *
 * Historical stock isn't reliable (items were sold), so product.quantity is set to 0 —
 * the shop should do a stock count. Idempotent (deterministic ids + skipDuplicates).
 *
 *   npx tsx scripts/migrate-legacy-purchases.ts <tenant-slug> [--commit] [--legacy-db=legacy_lebbis]
 */
import { readFileSync } from "fs";
import { createHash } from "crypto";
import mysql from "mysql2/promise";
import { prismaUnsafe } from "@/lib/db/prisma";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
const LEGACY_DB = args.find((a) => a.startsWith("--legacy-db="))?.split("=")[1] ?? "legacy_lebbis";
if (!slug) { console.error("Usage: npx tsx scripts/migrate-legacy-purchases.ts <tenant-slug> [--commit]"); process.exit(1); }

function legacyCfg() {
  const env = readFileSync(".env", "utf8");
  const line = env.split(/\r?\n/).find((l) => l.trim().startsWith("DATABASE_URL"))!;
  const raw = line.replace(/^\s*DATABASE_URL\s*=\s*/, "").replace(/^["']|["']$/g, "").trim();
  const u = new URL(raw);
  return { host: u.hostname, port: Number(u.port || 3306), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: LEGACY_DB, dateStrings: true as const };
}
function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(`${String(v).trim().replace(" ", "T")}Z`);
  return Number.isNaN(d.valueOf()) ? null : d;
}
function cleanStr(v: unknown, max = 250): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s ? s.slice(0, max) : null;
}
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

async function main() {
  const tenant = await prismaUnsafe.tenant.findFirst({ where: { OR: [{ slug }, { id: slug }] } });
  if (!tenant) throw new Error(`No tenant "${slug}"`);
  const tenantId = tenant.id;
  const id = (kind: string, key: string) => "lg" + createHash("sha1").update(`${tenantId}|${kind}|${key}`).digest("hex").slice(0, 23);
  console.log(`Target: "${tenant.businessName}"  mode: ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);

  const legacy = await mysql.createConnection(legacyCfg());
  const rows = async <T = any>(sql: string) => (await legacy.query<any[]>(sql))[0] as T[];

  // Product categories (reuse existing defaults, add legacy ones)
  const existingCats = await prismaUnsafe.productCategory.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const catByName = new Map(existingCats.map((c) => [c.name.toLowerCase(), c.id]));
  const catInserts: any[] = [];
  const ensureCat = (raw: unknown) => {
    const name = cleanStr(raw, 120) ?? "General";
    const key = name.toLowerCase();
    if (catByName.has(key)) return catByName.get(key)!;
    const cid = id("prodcat", key);
    catByName.set(key, cid);
    catInserts.push({ id: cid, tenantId, name, createdAt: new Date(), updatedAt: new Date() });
    return cid;
  };
  const defaultCatId = ensureCat("General");
  for (const r of await rows("SELECT DISTINCT category_name c FROM purchase WHERE category_name IS NOT NULL AND TRIM(category_name)<>''")) ensureCat(r.c);

  // Products (reuse by sku), cost from purchases
  const existingProds = await prismaUnsafe.product.findMany({ where: { tenantId }, select: { id: true, sku: true } });
  const prodBySku = new Map(existingProds.map((p) => [p.sku, p.id]));
  const costByCode = new Map((await rows("SELECT Product_Code code, AVG(Unit_Cost) cost FROM purchase WHERE Product_Code IS NOT NULL GROUP BY Product_Code")).map((r) => [String(r.code), num(r.cost)]));
  const codeRows = await rows("SELECT DISTINCT Product_Code code FROM product WHERE Product_Code IS NOT NULL AND TRIM(Product_Code)<>'' UNION SELECT DISTINCT Product_Code FROM purchase WHERE Product_Code IS NOT NULL AND TRIM(Product_Code)<>''");
  const prodByCode = new Map<string, string>();
  const prodInserts: any[] = [];
  for (const r of codeRows) {
    const code = cleanStr(r.code, 70);
    if (!code) continue;
    const sku = `LG-${code}`.slice(0, 80);
    if (prodBySku.has(sku)) { prodByCode.set(code, prodBySku.get(sku)!); continue; }
    const pid = id("product", code);
    prodByCode.set(code, pid);
    const cost = costByCode.get(code) ?? 0;
    prodInserts.push({ id: pid, tenantId, categoryId: defaultCatId, name: code, sku, costPrice: cost, sellingPrice: cost, quantity: 0, minimumStock: 0, unit: "pcs", createdAt: new Date(), updatedAt: new Date() });
  }

  // Suppliers name -> id (reuse migrated; fallback default)
  const suppliers = await prismaUnsafe.supplier.findMany({ where: { tenantId }, select: { id: true, supplierName: true } });
  const supByName = new Map(suppliers.map((s) => [s.supplierName.toLowerCase(), s.id]));
  const supInserts: any[] = [];
  const DEFAULT_SUP = "Imported Supplier";
  let defaultSupId = supByName.get(DEFAULT_SUP.toLowerCase());
  if (!defaultSupId) {
    defaultSupId = id("sup", DEFAULT_SUP);
    supByName.set(DEFAULT_SUP.toLowerCase(), defaultSupId);
    supInserts.push({ id: defaultSupId, tenantId, supplierName: DEFAULT_SUP, createdAt: new Date(), updatedAt: new Date() });
  }
  const supplierIdFor = (raw: unknown) => supByName.get((cleanStr(raw, 150) ?? "").toLowerCase()) ?? defaultSupId!;

  // Purchases + items
  const purchaseInserts: any[] = [];
  const purchaseItemInserts: any[] = [];
  for (const r of await rows("SELECT purchase_id, `Date`, Product_Code, Unit, Cost, Unit_Cost, category_name, supplier_name FROM purchase")) {
    const productId = prodByCode.get(cleanStr(r.Product_Code, 70) ?? "");
    if (!productId) continue; // no product to attach the line to
    const pid = id("purchase", String(r.purchase_id));
    const when = parseDate(r.Date) ?? new Date("2021-01-01Z");
    const qty = Math.max(1, Math.round(num(r.Unit)) || 1);
    const total = num(r.Cost) > 0 ? num(r.Cost) : qty * num(r.Unit_Cost);
    purchaseInserts.push({ id: pid, tenantId, supplierId: supplierIdFor(r.supplier_name), invoiceNo: `LEG-${r.purchase_id}`, purchaseDate: when, total, notes: "Imported from legacy system", createdAt: when, updatedAt: new Date() });
    purchaseItemInserts.push({ id: id("pitem", String(r.purchase_id)), tenantId, purchaseId: pid, productId, quantity: qty, unitCost: num(r.Unit_Cost), subtotal: total });
  }

  await legacy.end();

  console.log("Planned:");
  console.log(`  ProductCategories: ${catInserts.length}`);
  console.log(`  Products         : ${prodInserts.length}`);
  console.log(`  Suppliers (new)  : ${supInserts.length}`);
  console.log(`  Purchases        : ${purchaseInserts.length}`);
  console.log(`  PurchaseItems    : ${purchaseItemInserts.length}`);
  if (!COMMIT) { console.log("\nDRY RUN — nothing written. Re-run with --commit."); return; }

  const chunk = async (label: string, model: any, data: any[]) => {
    let done = 0;
    for (let i = 0; i < data.length; i += 1000) done += (await model.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true })).count;
    console.log(`  ✓ ${label}: +${done} (of ${data.length})`);
  };
  console.log("\nWriting…");
  await chunk("ProductCategories", prismaUnsafe.productCategory, catInserts);
  await chunk("Suppliers", prismaUnsafe.supplier, supInserts);
  await chunk("Products", prismaUnsafe.product, prodInserts);
  await chunk("Purchases", prismaUnsafe.purchase, purchaseInserts);
  await chunk("PurchaseItems", prismaUnsafe.purchaseItem, purchaseItemInserts);
  console.log("\n✓ Purchases migration complete.");
}

main().catch((e) => { console.error("✗", e instanceof Error ? e.stack : e); process.exit(1); }).finally(async () => { await prismaUnsafe.$disconnect(); });
