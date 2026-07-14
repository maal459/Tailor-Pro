/**
 * End-to-end test of the tenant lifecycle exposed by the platform admin UI:
 * provision -> owner can log in -> suspend -> login rejected -> reactivate -> login ok.
 * Exercises the SAME provisionTenant() helper the UI action calls. Cleans up after.
 * Run: npx tsx scripts/test-tenant-lifecycle.ts   (requires the dev server on :3000)
 */
import { prismaUnsafe } from "@/lib/db/prisma";
import { provisionTenant } from "@/lib/tenant-provisioning";

const BASE = "http://localhost:3000";
const slug = "qa-lifecycle-shop";
const email = "owner@qa-lifecycle.local";
const password = "lifecycle123";

let failures = 0;
const check = (label: string, ok: boolean) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
};

async function loginStatus() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return r.status;
}

async function cleanup() {
  const existing = await prismaUnsafe.tenant.findUnique({ where: { slug } });
  if (existing) {
    await prismaUnsafe.paymentMethod.deleteMany({ where: { tenantId: existing.id } });
    await prismaUnsafe.garmentType.deleteMany({ where: { tenantId: existing.id } });
    await prismaUnsafe.expenseCategory.deleteMany({ where: { tenantId: existing.id } });
    await prismaUnsafe.productCategory.deleteMany({ where: { tenantId: existing.id } });
    await prismaUnsafe.user.deleteMany({ where: { tenantId: existing.id } });
    await prismaUnsafe.tenant.delete({ where: { id: existing.id } });
  }
}

await cleanup();

console.log("1. Provision a tenant (same helper the platform UI action uses)");
const { tenant, owner } = await provisionTenant({
  businessName: "QA Lifecycle Shop",
  slug,
  ownerName: "QA Owner",
  ownerEmail: email,
  password,
  subscriptionPlan: "BASIC"
});
check("tenant created with slug", tenant.slug === slug);
check("owner admin user created", owner.email === email && owner.role === "admin");
const methods = await prismaUnsafe.paymentMethod.count({ where: { tenantId: tenant.id } });
check("default payment methods provisioned (4)", methods === 4);

console.log("\n2. Owner can log in while ACTIVE");
check("login returns 200", (await loginStatus()) === 200);

console.log("\n3. Suspending the tenant locks the owner out at login");
await prismaUnsafe.tenant.update({ where: { id: tenant.id }, data: { status: "SUSPENDED" } });
check("login returns 403 while SUSPENDED", (await loginStatus()) === 403);

console.log("\n4. Reactivating restores access");
await prismaUnsafe.tenant.update({ where: { id: tenant.id }, data: { status: "ACTIVE" } });
check("login returns 200 again", (await loginStatus()) === 200);

console.log("\n5. Duplicate slug/email is rejected");
let dupRejected = false;
try {
  await provisionTenant({ businessName: "Dup", slug, ownerEmail: "x@y.local", password: "abcdefgh" });
} catch {
  dupRejected = true;
}
check("provisioning a duplicate slug throws", dupRejected);

console.log("\nCleaning up...");
await cleanup();
await prismaUnsafe.$disconnect();

console.log(failures ? `\n${failures} CHECK(S) FAILED` : "\nAll tenant-lifecycle checks passed");
process.exit(failures ? 1 : 0);
