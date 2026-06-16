import type { FinancialClassification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inventoryValueAt } from "./inventory-at-date";

/** Costo de comida: solo ingredientes (no empaques). */
const FOOD_COST_CLASS: FinancialClassification = "FOOD_COST";

const foodProductFilter = {
  classifications: [FOOD_COST_CLASS] as FinancialClassification[],
  includeInFoodCost: true,
};

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

async function sumPurchases(start: Date, end: Date, storeId?: string) {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      type: { in: ["PURCHASE", "ENTRY"] },
      date: { gte: start, lte: end },
      isReversal: false,
      reversedAt: null,
      ...(storeId ? { location: { storeId } } : {}),
      product: foodProductFilter,
    },
  });

  return movements.reduce((sum, m) => sum + (m.totalCost ?? 0), 0);
}

/** Transferencias entre tiendas distintas (salida de la tienda). */
async function sumInterStoreTransfersOut(
  start: Date,
  end: Date,
  storeId?: string
) {
  const transfers = await prisma.transfer.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(storeId ? { fromLocation: { storeId } } : {}),
      product: foodProductFilter,
    },
    include: {
      fromLocation: { select: { storeId: true } },
      toLocation: { select: { storeId: true } },
      movementOut: { select: { totalCost: true } },
    },
  });

  return transfers
    .filter((t) => t.fromLocation.storeId !== t.toLocation.storeId)
    .reduce((sum, t) => sum + (t.movementOut.totalCost ?? 0), 0);
}

/** Préstamos OUT pendientes al cierre — se suman al inventario final para FC. */
async function outstandingLoansOutValue(at: Date, storeId?: string) {
  const loans = await prisma.loan.findMany({
    where: {
      direction: "OUT",
      date: { lte: at },
      status: { not: "COMPLETE_RETURN" },
      ...(storeId ? { location: { storeId } } : {}),
      product: foodProductFilter,
    },
  });

  return loans.reduce((sum, loan) => {
    const pending = loan.quantity - loan.quantityReturned;
    return sum + pending * loan.unitCost;
  }, 0);
}

/** Préstamos IN pendientes (mercancía prestada por otra tienda) — se restan del cierre físico. */
async function outstandingLoansInValue(at: Date, storeId?: string) {
  const loans = await prisma.loan.findMany({
    where: {
      direction: "IN",
      date: { lte: at },
      status: { not: "COMPLETE_RETURN" },
      ...(storeId ? { location: { storeId } } : {}),
      product: foodProductFilter,
    },
  });

  return loans.reduce((sum, loan) => {
    const pending = loan.quantity - loan.quantityReturned;
    return sum + pending * loan.unitCost;
  }, 0);
}

/**
 * Uso en $ = Inventario inicial + Compras − Transferencias entre tiendas − Inventario final ajustado
 *
 * Inventario final ajustado = físico + préstamos OUT pendientes − préstamos IN pendientes
 * (prestar no afecta el food cost; devolver lo prestado sí lo refleja al bajar el pendiente IN)
 */
export async function calculateFinancialPeriod(input: FinancialAnalysisInput) {
  const periodStart = startOfDay(input.startDate);
  const periodEnd = endOfDay(input.endDate);

  const openingInventoryValue = await inventoryValueAt(
    new Date(periodStart.getTime() - 1),
    input.storeId,
    foodProductFilter
  );

  const closingPhysicalValue = await inventoryValueAt(
    periodEnd,
    input.storeId,
    foodProductFilter
  );

  const [
    purchasesValue,
    transfersOutValue,
    loansOutPendingValue,
    loansInPendingValue,
  ] = await Promise.all([
    sumPurchases(periodStart, periodEnd, input.storeId),
    sumInterStoreTransfersOut(periodStart, periodEnd, input.storeId),
    outstandingLoansOutValue(periodEnd, input.storeId),
    outstandingLoansInValue(periodEnd, input.storeId),
  ]);

  const closingInventoryValue =
    closingPhysicalValue + loansOutPendingValue - loansInPendingValue;

  const costOfSales =
    openingInventoryValue +
    purchasesValue -
    transfersOutValue -
    closingInventoryValue;

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
    transfersOutValue,
    loansInValue: loansInPendingValue,
    closingPhysicalValue,
    closingInventoryValue,
    loansOutValue: loansOutPendingValue,
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
      openingInventoryValue: metrics.openingInventoryValue,
      purchasesValue: metrics.purchasesValue,
      loansInValue: metrics.loansInValue,
      closingInventoryValue: metrics.closingInventoryValue,
      loansOutValue: metrics.loansOutValue,
      costOfSales: metrics.costOfSales,
      actualFullCostPercent: metrics.actualFullCostPercent,
      variancePercent: metrics.variancePercent,
      opportunityDollars: metrics.opportunityDollars,
      status: "CLOSED",
    },
  });
}
