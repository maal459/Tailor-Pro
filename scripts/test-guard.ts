import { prisma, prismaUnsafe } from "@/lib/db/prisma";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
}

async function throws(fn: () => Promise<unknown>) {
  try {
    await fn();
    return false;
  } catch (e) {
    return e instanceof Error && e.message.includes("Tenant isolation violation");
  }
}

// Reads without tenantId must throw
check("customer.findMany() without tenantId throws", await throws(() => prisma.customer.findMany()));
check("order.findMany({}) without tenantId throws", await throws(() => prisma.order.findMany({})));
check("payment.count() without tenantId throws", await throws(() => prisma.payment.count()));
check(
  "customer.findUnique by id-only throws",
  await throws(() => prisma.customer.findUnique({ where: { id: "x" } }))
);

// Writes without tenantId must throw
check(
  "customer.create without data.tenantId throws",
  await throws(() =>
    prisma.customer.create({ data: { customerNumber: "X", fullName: "X", phone: "1" } as never })
  )
);
check(
  "customer.updateMany without where.tenantId throws",
  await throws(() => prisma.customer.updateMany({ where: { city: "X" }, data: { city: "Y" } }))
);

// Scoped reads must PASS (not throw)
check(
  "customer.findMany({ where: { tenantId } }) passes",
  !(await throws(() => prisma.customer.findMany({ where: { tenantId: "tenant_demo" } })))
);
check(
  "findFirst({ where: { id, tenantId } }) passes",
  !(await throws(() =>
    prisma.customer.findFirst({ where: { id: "nope", tenantId: "tenant_demo" } })
  ))
);

// Compound-unique upsert (setting) must PASS the guard
check(
  "setting.findUnique compound tenantId_key passes guard",
  !(await throws(() =>
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId: "tenant_demo", key: "nope" } } })
  ))
);

// Tenant model itself is not tenant-scoped -> unguarded
check("tenant.findMany() passes (not scoped)", !(await throws(() => prisma.tenant.findMany())));

// prismaUnsafe bypasses the guard entirely
check(
  "prismaUnsafe.customer.findMany() does NOT throw",
  !(await throws(() => prismaUnsafe.customer.findMany({ take: 1 })))
);

await prisma.$disconnect();
console.log(failures ? `\n${failures} FAILED` : "\nAll guard checks passed");
process.exit(failures ? 1 : 0);
