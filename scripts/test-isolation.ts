/**
 * Multi-tenant isolation audit. Creates tenants A, B, C with representative data,
 * then attempts cross-tenant reads / updates / deletes / IDOR / stock manipulation
 * through the REAL repositories, services, and guarded client — asserting each is
 * denied. Cleans up after itself. Run: npx tsx scripts/test-isolation.ts
 */
import { PaymentMethodCode } from "@prisma/client";
import { prisma, prismaUnsafe } from "@/lib/db/prisma";
import { customerRepository } from "@/lib/repositories/customer-repository";
import { expenseRepository } from "@/lib/repositories/expense-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { supplierRepository } from "@/lib/repositories/supplier-repository";
import { purchaseRepository } from "@/lib/repositories/purchase-repository";
import { userRepository } from "@/lib/repositories/user-repository";
import { financeService } from "@/lib/services/finance-service";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  -> ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}
async function threw(fn: () => Promise<unknown>) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

const TENANTS = ["iso_A", "iso_B", "iso_C"] as const;

async function cleanup() {
  for (const t of TENANTS) {
    await prismaUnsafe.purchaseItem.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.purchase.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.product.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.productCategory.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.supplier.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.salary.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.employee.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.expense.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.expenseCategory.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.payment.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.orderItem.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.order.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.measurement.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.measurementProfile.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.customer.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.garmentType.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.paymentMethod.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.activityLog.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.user.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.setting.deleteMany({ where: { tenantId: t } });
    await prismaUnsafe.tenant.deleteMany({ where: { id: t } });
  }
}

async function seedTenant(id: string) {
  await prismaUnsafe.tenant.create({
    data: { id, businessName: `Biz ${id}`, slug: id.toLowerCase(), status: "ACTIVE" }
  });
  const user = await prismaUnsafe.user.create({
    data: { tenantId: id, fullName: `Owner ${id}`, email: `owner@${id}.local`, passwordHash: "x", role: "admin" }
  });
  const customer = await prismaUnsafe.customer.create({
    data: { tenantId: id, customerNumber: `${id}-C1`, fullName: `Customer ${id}`, phone: `100-${id}` }
  });
  const garment = await prismaUnsafe.garmentType.create({ data: { tenantId: id, name: "Suit" } });
  const method = await prismaUnsafe.paymentMethod.create({
    data: { tenantId: id, code: PaymentMethodCode.CASH, label: "Cash" }
  });
  const order = await prismaUnsafe.order.create({
    data: {
      tenantId: id,
      orderNumber: `${id}-O1`,
      customerId: customer.id,
      items: { create: [{ tenantId: id, garmentTypeId: garment.id, quantity: 1, unitPrice: 100 }] }
    }
  });
  await prismaUnsafe.payment.create({
    data: { tenantId: id, orderId: order.id, customerId: customer.id, paymentMethodId: method.id, amount: 40 }
  });
  const expCat = await prismaUnsafe.expenseCategory.create({ data: { tenantId: id, name: "Rent" } });
  const expense = await prismaUnsafe.expense.create({
    data: { tenantId: id, title: `Rent ${id}`, amount: 25, categoryId: expCat.id }
  });
  const supplier = await prismaUnsafe.supplier.create({ data: { tenantId: id, supplierName: `Supplier ${id}` } });
  const prodCat = await prismaUnsafe.productCategory.create({ data: { tenantId: id, name: "Fabric" } });
  const product = await prismaUnsafe.product.create({
    data: { tenantId: id, categoryId: prodCat.id, name: `Cloth ${id}`, sku: `${id}-SKU1`, costPrice: 5, sellingPrice: 9, quantity: 10 }
  });
  const purchase = await purchaseRepository.createWithItems(
    { tenantId: id, supplierId: supplier.id, items: [{ productId: product.id, quantity: 3, unitCost: 5 }] },
    user.id
  );
  return { user, customer, order, expense, supplier, product, purchase };
}

await cleanup();
console.log("Seeding tenants A, B, C...");
const A = await seedTenant("iso_A");
const B = await seedTenant("iso_B");
await seedTenant("iso_C");

console.log("\n1. List queries return only the caller's tenant");
const aCustomers = await customerRepository.list("iso_A");
check("customerRepository.list(A) returns only A rows", aCustomers.rows.every((c) => c.tenantId === "iso_A") && aCustomers.rows.length === 1);
const aProducts = await productRepository.list("iso_A");
check("productRepository.list(A) excludes B/C products", aProducts.rows.every((p) => p.tenantId === "iso_A"));
const aUsers = await userRepository.list("iso_A");
check("userRepository.list(A) excludes other tenants' users", (aUsers.rows as Array<{ tenantId: string }>).every((u) => u.tenantId === "iso_A"));

console.log("\n2. Search cannot surface another tenant's records");
const crossSearch = await customerRepository.list("iso_A", "Customer iso_B");
check("A searching for B's customer name returns nothing", crossSearch.rows.length === 0);

console.log("\n3. IDOR reads by another tenant's id are denied");
check("expenseRepository.byId(A, B.expense) is null", (await expenseRepository.byId("iso_A", B.expense.id)) === null);
check("purchaseRepository.byId(A, B.purchase) is null", (await purchaseRepository.byId("iso_A", B.purchase!.id)) === null);
check("financeService.orderTotals(A, B.order) is null", (await financeService.orderTotals("iso_A", B.order.id)) === null);

console.log("\n4. Cross-tenant writes affect zero rows");
const upd = await expenseRepository.update("iso_A", B.expense.id, { title: "HACKED", amount: 9999 });
check("expenseRepository.update(A, B.expense) updates 0 rows", upd.count === 0, upd);
const bExpenseAfter = await prismaUnsafe.expense.findUnique({ where: { id: B.expense.id } });
check("B's expense is unchanged after A's update attempt", bExpenseAfter?.title === "Rent iso_B" && Number(bExpenseAfter?.amount) === 25);
const del = await expenseRepository.remove("iso_A", B.expense.id);
check("expenseRepository.remove(A, B.expense) deletes 0 rows", del.count === 0, del);
check("B's expense still exists after A's delete attempt", (await prismaUnsafe.expense.count({ where: { id: B.expense.id } })) === 1);

console.log("\n5. Cross-tenant stock manipulation is denied");
const reversalBlocked = await threw(() => purchaseRepository.removeWithStockReversal("iso_A", B.purchase!.id, A.user.id));
check("removeWithStockReversal(A, B.purchase) throws", reversalBlocked);
check("B's purchase still exists", (await prismaUnsafe.purchase.count({ where: { id: B.purchase!.id } })) === 1);
const bProductQty = await prismaUnsafe.product.findUnique({ where: { id: B.product.id } });
check("B's product stock untouched by A", bProductQty?.quantity === 13);

console.log("\n6. Supplier purchase history is tenant-scoped");
const aHistOfB = await supplierRepository.purchaseHistory("iso_A", B.supplier.id);
check("purchaseHistory(A, B.supplier) is empty", aHistOfB.purchaseCount === 0 && aHistOfB.purchases.length === 0);

console.log("\n7. Financial reports never mix tenants");
const aPL = await financeService.profitLossSummary("iso_A", { from: new Date("2000-01-01"), to: new Date("2999-01-01") });
check("A income = only A's payment (40)", aPL.totalIncome === 40, aPL.totalIncome);
check("A expenses = only A's expense (25)", aPL.totalExpenses === 25, aPL.totalExpenses);
check("A purchases = only A's purchase (15)", aPL.totalPurchases === 15, aPL.totalPurchases);

console.log("\n8. The guard blocks any unscoped query (defense in depth)");
check("prisma.order.findMany() throws", await threw(() => prisma.order.findMany()));
check("prisma.customer.count() throws", await threw(() => prisma.customer.count()));

console.log("\nCleaning up...");
await cleanup();
await prisma.$disconnect();

console.log(failures ? `\n${failures} CHECK(S) FAILED` : "\nAll isolation checks passed");
process.exit(failures ? 1 : 0);
