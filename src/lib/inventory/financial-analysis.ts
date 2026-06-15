import type { FinancialClassification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inventoryValueAt } from "./inventory-at-date";

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

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
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
  const periodStart = startOfDay(input.startDate);
  const periodEnd = endOfDay(input.endDate);
  const productFilter = {
    classifications: COGS_CLASSES,
    includeInFoodCost: true,
  };

  // Inventario justo antes del período (apertura)
  const openingInventoryValue = await inventoryValueAt(
    new Date(periodStart.getTime() - 1),
    input.storeId,
    productFilter
  );

  const closingInventoryValue = await inventoryValueAt(
    periodEnd,
    input.storeId,
    productFilter
  );

  const purchasesValue = await sumMovements(
    ["PURCHASE", "ENTRY"],
    periodStart,
    periodEnd,
    input.storeId
  );

  const loansInValue = await sumMovements(
    ["LOAN_IN"],
    periodStart,
    periodEnd,
    input.storeId
  );

  const loansOutValue = await outstandingLoansValue(
    "OUT",
    periodEnd,
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
      startDate: startOfDay(input.startDate),
      endDate: endOfDay(input.endDate),
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
