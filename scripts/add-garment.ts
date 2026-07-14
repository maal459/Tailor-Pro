import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const garment = await prisma.garmentType.upsert({
  where: { tenantId_name: { tenantId: "tenant_demo", name: "Khamiis" } },
  update: { isActive: true },
  create: { tenantId: "tenant_demo", name: "Khamiis" }
});

console.log("✓ Added garment type:", garment.name);
await prisma.$disconnect();
