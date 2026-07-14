import { PrismaClient, PaymentMethodCode, Priority, OrderState } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "tenant_demo";

  // The tenant must exist before any tenant-scoped row references it (FK).
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      businessName: "Tailor Pro",
      slug: "tailor-pro",
      ownerName: "Shop Admin",
      email: "admin@tailorpro.local",
      subscriptionPlan: "PRO",
      status: "ACTIVE"
    }
  });

  const adminPassword = await bcrypt.hash("admin12345", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@tailorpro.local" },
    update: {},
    create: {
      tenantId,
      fullName: "Shop Admin",
      email: "admin@tailorpro.local",
      passwordHash: adminPassword,
      role: "admin"
    }
  });

  const garmentNames = ["Suit", "Shirt", "Trouser", "Dress", "Abaya", "Custom Garment"];
  for (const name of garmentNames) {
    await prisma.garmentType.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name }
    });
  }

  const methods = [
    { code: PaymentMethodCode.CASH, label: "Cash" },
    { code: PaymentMethodCode.CARD, label: "Card" },
    { code: PaymentMethodCode.BANK_TRANSFER, label: "Bank Transfer" },
    { code: PaymentMethodCode.MOBILE_MONEY, label: "Mobile Money" }
  ];

  for (const method of methods) {
    await prisma.paymentMethod.upsert({
      where: { tenantId_code: { tenantId, code: method.code } },
      update: { label: method.label },
      create: { tenantId, code: method.code, label: method.label }
    });
  }

  const customer = await prisma.customer.upsert({
    where: { customerNumber: "CUST-0001" },
    update: {},
    create: {
      tenantId,
      customerNumber: "CUST-0001",
      fullName: "Amina Noor",
      phone: "+252610000001",
      city: "Mogadishu"
    }
  });

  const suitType = await prisma.garmentType.findFirstOrThrow({ where: { tenantId, name: "Suit" } });
  const cashMethod = await prisma.paymentMethod.findFirstOrThrow({ where: { tenantId, code: PaymentMethodCode.CASH } });

  const profile = await prisma.measurementProfile.create({
    data: {
      tenantId,
      customerId: customer.id,
      garmentTypeId: suitType.id,
      name: "Suit Standard",
      fields: {
        create: [
          { tenantId, fieldName: "Shoulder", fieldValue: "18" },
          { tenantId, fieldName: "Chest", fieldValue: "40" },
          { tenantId, fieldName: "Waist", fieldValue: "36" }
        ]
      }
    }
  });

  let order = await prisma.order.findUnique({ where: { orderNumber: "ORD-0001" } });
  if (!order) {
    order = await prisma.order.create({
      data: {
        tenantId,
        orderNumber: "ORD-0001",
        customerId: customer.id,
        priority: Priority.NORMAL,
        status: OrderState.SEWING,
        discountAmount: 0,
        items: {
          create: [
            {
              tenantId,
              garmentTypeId: suitType.id,
              measurementProfileId: profile.id,
              quantity: 1,
              unitPrice: 300,
              fabric: "Wool Blend",
              color: "Navy"
            }
          ]
        }
      }
    });
  }

  const existingPayment = await prisma.payment.findFirst({ where: { tenantId, orderId: order.id } });
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        tenantId,
        orderId: order.id,
        customerId: customer.id,
        paymentMethodId: cashMethod.id,
        receivedById: admin.id,
        amount: 100,
        notes: "Advance payment"
      }
    });
  }

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId, key: "shop.name" } },
    update: { value: "Tailor Pro" },
    create: { tenantId, key: "shop.name", value: "Tailor Pro" }
  });

  const expenseCategories = ["Rent", "Utilities", "Equipment", "Transport", "Miscellaneous"];
  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name }
    });
  }

  const productCategories = ["Fabric", "Accessories", "General"];
  for (const name of productCategories) {
    await prisma.productCategory.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name }
    });
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
