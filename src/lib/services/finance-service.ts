import { prisma } from "@/lib/db/prisma";
import { toNumber } from "@/lib/utils";

export type DateRange = {
  from: Date;
  to: Date;
};

function sumDecimal(value: unknown) {
  return toNumber(value ?? 0);
}

export const financeService = {
  async orderTotals(tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, payments: true }
    });

    if (!order) {
      return null;
    }

    const itemTotal = order.items.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0);
    const discount = toNumber(order.discountAmount);
    const grossTotal = itemTotal - discount;
    const paid = order.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const balance = grossTotal - paid;

    return {
      itemTotal,
      discount,
      grossTotal,
      paid,
      balance
    };
  },

  async customerLedger(tenantId: string, customerId: string) {
    const [orders, payments] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, customerId },
        include: { items: true },
        orderBy: { orderDate: "asc" }
      }),
      prisma.payment.findMany({
        where: { tenantId, customerId },
        orderBy: { paymentDate: "asc" }
      })
    ]);

    const entries: Array<{
      date: Date;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    for (const order of orders) {
      const orderTotal =
        order.items.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0) -
        toNumber(order.discountAmount);
      entries.push({
        date: order.orderDate,
        description: `Order ${order.orderNumber}`,
        debit: orderTotal,
        credit: 0
      });
    }

    for (const payment of payments) {
      entries.push({
        date: payment.paymentDate,
        description: "Payment",
        debit: 0,
        credit: toNumber(payment.amount)
      });
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    return entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });
  },

  async expenseTotals(tenantId: string, range: DateRange) {
    const result = await prisma.expense.aggregate({
      where: { tenantId, expenseDate: { gte: range.from, lte: range.to } },
      _sum: { amount: true }
    });

    return sumDecimal(result._sum.amount);
  },

  async salaryTotals(tenantId: string, range: DateRange) {
    const result = await prisma.salary.aggregate({
      where: { tenantId, paymentDate: { gte: range.from, lte: range.to } },
      _sum: { amount: true }
    });

    return sumDecimal(result._sum.amount);
  },

  async purchaseTotals(tenantId: string, range: DateRange) {
    const result = await prisma.purchase.aggregate({
      where: { tenantId, purchaseDate: { gte: range.from, lte: range.to } },
      _sum: { total: true }
    });

    return sumDecimal(result._sum.total);
  },

  async stockSummary(tenantId: string) {
    const products = await prisma.product.findMany({
      where: { tenantId },
      include: { category: true, supplier: true },
      orderBy: { name: "asc" }
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category.name,
      supplier: product.supplier?.supplierName ?? "-",
      quantity: product.quantity,
      minimumStock: product.minimumStock,
      sellingPrice: sumDecimal(product.sellingPrice),
      costPrice: sumDecimal(product.costPrice),
      lowStock: product.quantity > 0 && product.quantity <= product.minimumStock,
      outOfStock: product.quantity <= 0
    }));
  },

  async cashSummary(tenantId: string, range: DateRange) {
    const [income, expenses, salaries] = await Promise.all([
      prisma.payment.aggregate({
        where: { tenantId, paymentDate: { gte: range.from, lte: range.to } },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { tenantId, expenseDate: { gte: range.from, lte: range.to } },
        _sum: { amount: true }
      }),
      prisma.salary.aggregate({
        where: { tenantId, paymentDate: { gte: range.from, lte: range.to } },
        _sum: { amount: true }
      })
    ]);

    const totalIncome = sumDecimal(income._sum.amount);
    const totalExpenses = sumDecimal(expenses._sum.amount);
    const totalSalaries = sumDecimal(salaries._sum.amount);

    return {
      totalIncome,
      totalExpenses,
      totalSalaries,
      availableCash: totalIncome - totalExpenses - totalSalaries,
      netProfit: totalIncome - totalExpenses - totalSalaries
    };
  },

  async profitLossSummary(tenantId: string, range: DateRange) {
    const [income, expenses, salaries, purchases] = await Promise.all([
      prisma.payment.aggregate({
        where: { tenantId, paymentDate: { gte: range.from, lte: range.to } },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { tenantId, expenseDate: { gte: range.from, lte: range.to } },
        _sum: { amount: true }
      }),
      prisma.salary.aggregate({
        where: { tenantId, paymentDate: { gte: range.from, lte: range.to } },
        _sum: { amount: true }
      }),
      prisma.purchase.aggregate({
        where: { tenantId, purchaseDate: { gte: range.from, lte: range.to } },
        _sum: { total: true }
      })
    ]);

    const totalIncome = sumDecimal(income._sum.amount);
    const totalExpenses = sumDecimal(expenses._sum.amount);
    const totalSalaries = sumDecimal(salaries._sum.amount);
    const totalPurchases = sumDecimal(purchases._sum.total);

    return {
      totalIncome,
      totalExpenses,
      totalSalaries,
      totalPurchases,
      availableCash: totalIncome - totalExpenses - totalSalaries,
      netProfit: totalIncome - totalExpenses - totalSalaries - totalPurchases
    };
  }
};
