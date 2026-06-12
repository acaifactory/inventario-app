import type { FinancialClassification } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COGS_CLASSES: FinancialClassification[] = [
  "FOOD_COST",
  "PACKAGING_COST",
];

export type FinancialAnalysisInput = {
  startDate: Date;
  endDate: Date;
  totalSales: number;
  targetFullCostPercent: number;
  responsibleName: string;
  userId: string;
  storeId?: string;
};

async function inventoryValueAt(
  at: Date,
  storeId?: string,
  classifications = COGS_CLASSES
) {
  const stocks = await prisma.productStock.findMany({
    where: {
      quantity: { gt: 0 },
      ...(storeId ? { location: { storeId } } : {}),
      product: {
        financialClassification: { in: classifications },
        includeInFoodCost: true,
      },
    },
    include: { product: true },
  });

  void at;
  return stocks.reduce((sum, s) => sum + s.quantity * s.product.averageCost, 0);
}

async function sumMovements(
  types: string[],
  start: Date,
  end: Date,
  storeId?: string
) {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      type: { in: types as never },
      date: { gte: start, lte: end },
      isReversal: false,
      reversedAt: null,
      ...(storeId ? { location: { storeId } } : {}),
      product: { includeInFoodCost: true },
    },
    include: { product: true },
  });

  return movements.reduce((sum, m) => sum + (m.totalCost ?? 0), 0);
}

async function outstandingLoansValue(
  direction: "OUT" | "IN",
  at: Date,
  storeId?: string
) {
  const loans = await prisma.loan.findMany({
    where: {
      direction,
      date: { lte: at },
      status: { not: "COMPLETE_RETURN" },
      ...(storeId ? { location: { storeId } } : {}),
      product: { includeInFoodCost: true },
    },
  });

  return loans.reduce((sum, loan) => {
    const pending = loan.quantity - loan.quantityReturned;
    return sum + pending * loan.unitCost;
  }, 0);
}

export async function calculateFinancialPeriod(
  input: FinancialAnalysisInput
) {
  const openingInventoryValue = await inventoryValueAt(input.startDate, input.storeId);
  const closingInventoryValue = await inventoryValueAt(input.endDate, input.storeId);

  const purchasesValue = await sumMovements(
    ["PURCHASE", "ENTRY"],
    input.startDate,
    input.endDate,
    input.storeId
  );

  const loansInValue = await sumMovements(
    ["LOAN_IN"],
    input.startDate,
    input.endDate,
    input.storeId
  );

  const loansOutValue = await outstandingLoansValue(
    "OUT",
    input.endDate,
    input.storeId
  );

  const costOfSales =
    openingInventoryValue +
    purchasesValue +
    loansInValue -
    closingInventoryValue -
    loansOutValue;

  const actualFullCostPercent =
    input.totalSales > 0 ? (costOfSales / input.totalSales) * 100 : 0;

  const variancePercent =
    actualFullCostPercent - input.targetFullCostPercent;

  const opportunityDollars =
    variancePercent > 0
      ? (variancePercent / 100) * input.totalSales
      : 0;

  return {
    openingInventoryValue,
    purchasesValue,
    loansInValue,
    closingInventoryValue,
    loansOutValue,
    costOfSales,
    actualFullCostPercent,
    variancePercent,
    opportunityDollars,
  };
}

export async function createFinancialPeriod(input: FinancialAnalysisInput) {
  const metrics = await calculateFinancialPeriod(input);

  return prisma.financialPeriod.create({
    data: {
      startDate: input.startDate,
      endDate: input.endDate,
      totalSales: input.totalSales,
      targetFullCostPercent: input.targetFullCostPercent,
      responsibleName: input.responsibleName,
      userId: input.userId,
      storeId: input.storeId,
      ...metrics,
      status: "CLOSED",
    },
  });
}
