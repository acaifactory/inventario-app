import { prisma } from "@/lib/prisma";
import { getUnitLabel } from "@/lib/utils";
import { subWeeks, differenceInDays } from "date-fns";
import type { UnitOfMeasure } from "@prisma/client";

export const WEEKS_FOR_ANALYSIS = 4;
export const WEEKS_OF_COVERAGE = 2;

export type Urgency = "urgent" | "soon" | "planned" | "ok";

export interface ProductUsage {
  productId: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  unitLabel: string;
  quantityUsed: number;
  valueUsed: number;
  weeklyAvgQty: number;
  weeklyAvgValue: number;
  currentStock: number;
  stockValue: number;
  movementCount: number;
}

export interface FastMover extends ProductUsage {
  rank: number;
  shareOfTotalQty: number;
  shareOfTotalValue: number;
}

export interface PurchaseSuggestion {
  productId: string;
  name: string;
  category: string;
  unit: UnitOfMeasure;
  unitLabel: string;
  supplier: string | null;
  currentStock: number;
  minQuantity: number;
  weeklyAvgQty: number;
  weeklyAvgValue: number;
  suggestedQty: number;
  estimatedCost: number;
  daysUntilStockout: number | null;
  weeksOfStockLeft: number | null;
  urgency: Urgency;
  reason: string;
}

export interface UsageSummary {
  periodWeeks: number;
  periodStart: Date;
  periodEnd: Date;
  totalQuantityUsed: number;
  totalValueUsed: number;
  weeklyAvgQuantity: number;
  weeklyAvgValue: number;
  productCount: number;
  fastMovers: FastMover[];
  allUsage: ProductUsage[];
  purchaseSuggestions: PurchaseSuggestion[];
  totalSuggestedCost: number;
  urgentCount: number;
}

/** Solo salidas reales (venta, uso interno, desperdicio, etc.) cuentan como consumo. */
const CONSUMPTION_TYPES = ["EXIT"] as const;

function getUrgency(
  currentStock: number,
  minQuantity: number,
  weeklyAvgQty: number,
  daysUntilStockout: number | null
): Urgency {
  if (currentStock <= minQuantity || (daysUntilStockout !== null && daysUntilStockout <= 3)) {
    return "urgent";
  }
  if (daysUntilStockout !== null && daysUntilStockout <= 7) {
    return "soon";
  }
  if (weeklyAvgQty > 0 && currentStock < weeklyAvgQty * WEEKS_OF_COVERAGE) {
    return "planned";
  }
  return "ok";
}

function buildReason(
  urgency: Urgency,
  currentStock: number,
  weeklyAvgQty: number,
  suggestedQty: number,
  unitLabel: string
): string {
  switch (urgency) {
    case "urgent":
      return `Stock crítico: ${currentStock} ${unitLabel}. Consumo semanal ~${weeklyAvgQty.toFixed(1)} ${unitLabel}.`;
    case "soon":
      return `Queda menos de 1 semana de inventario al ritmo actual.`;
    case "planned":
      return `Comprar ${suggestedQty} ${unitLabel} para cubrir ${WEEKS_OF_COVERAGE} semanas.`;
    default:
      return "Stock suficiente por ahora.";
  }
}

export async function getUsageAnalytics(
  weeks: number = WEEKS_FOR_ANALYSIS
): Promise<UsageSummary> {
  const periodEnd = new Date();
  const periodStart = subWeeks(periodEnd, weeks);
  const periodDays = Math.max(differenceInDays(periodEnd, periodStart), 1);

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      type: { in: [...CONSUMPTION_TYPES] },
      date: { gte: periodStart, lte: periodEnd },
      isReversal: false,
      exitReason: { notIn: ["TRANSFER", "ADJUSTMENT"] },
    },
    select: {
      productId: true,
      quantity: true,
      totalCost: true,
      unitCost: true,
    },
  });

  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      category: true,
      supplier: true,
      stocks: true,
    },
  });

  const usageMap = new Map<
    string,
    { quantityUsed: number; valueUsed: number; movementCount: number }
  >();

  for (const m of movements) {
    const value = m.totalCost ?? m.quantity * (m.unitCost ?? 0);
    const existing = usageMap.get(m.productId) ?? {
      quantityUsed: 0,
      valueUsed: 0,
      movementCount: 0,
    };
    usageMap.set(m.productId, {
      quantityUsed: existing.quantityUsed + m.quantity,
      valueUsed: existing.valueUsed + value,
      movementCount: existing.movementCount + 1,
    });
  }

  const allUsage: ProductUsage[] = products
    .map((product) => {
      const usage = usageMap.get(product.id) ?? {
        quantityUsed: 0,
        valueUsed: 0,
        movementCount: 0,
      };
      const currentStock = product.stocks.reduce((s, st) => s + st.quantity, 0);
      const weeklyAvgQty = (usage.quantityUsed / periodDays) * 7;
      const weeklyAvgValue = (usage.valueUsed / periodDays) * 7;

      return {
        productId: product.id,
        name: product.name,
        category: product.category.name,
        unit: product.unit,
        unitLabel: getUnitLabel(product.unit),
        quantityUsed: usage.quantityUsed,
        valueUsed: usage.valueUsed,
        weeklyAvgQty,
        weeklyAvgValue,
        currentStock,
        stockValue: currentStock * product.averageCost,
        movementCount: usage.movementCount,
      };
    })
    .filter((p) => p.quantityUsed > 0 || p.currentStock > 0)
    .sort((a, b) => b.quantityUsed - a.quantityUsed);

  const totalQuantityUsed = allUsage.reduce((s, p) => s + p.quantityUsed, 0);
  const totalValueUsed = allUsage.reduce((s, p) => s + p.valueUsed, 0);

  const fastMovers: FastMover[] = allUsage
    .filter((p) => p.quantityUsed > 0)
    .slice(0, 15)
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      shareOfTotalQty:
        totalQuantityUsed > 0 ? (p.quantityUsed / totalQuantityUsed) * 100 : 0,
      shareOfTotalValue:
        totalValueUsed > 0 ? (p.valueUsed / totalValueUsed) * 100 : 0,
    }));

  const purchaseSuggestions: PurchaseSuggestion[] = products
    .map((product) => {
      const usage = usageMap.get(product.id);
      const currentStock = product.stocks.reduce((s, st) => s + st.quantity, 0);
      const weeklyAvgQty = usage
        ? (usage.quantityUsed / periodDays) * 7
        : 0;
      const weeklyAvgValue = usage ? (usage.valueUsed / periodDays) * 7 : 0;

      const targetStock = Math.max(
        product.minQuantity,
        weeklyAvgQty * WEEKS_OF_COVERAGE
      );
      const suggestedQty = Math.max(0, Math.ceil(targetStock - currentStock));

      const dailyAvg = weeklyAvgQty / 7;
      const daysUntilStockout =
        dailyAvg > 0 ? Math.floor(currentStock / dailyAvg) : null;
      const weeksOfStockLeft =
        weeklyAvgQty > 0 ? currentStock / weeklyAvgQty : null;

      const urgency = getUrgency(
        currentStock,
        product.minQuantity,
        weeklyAvgQty,
        daysUntilStockout
      );

      return {
        productId: product.id,
        name: product.name,
        category: product.category.name,
        unit: product.unit,
        unitLabel: getUnitLabel(product.unit),
        supplier: product.supplier?.name ?? null,
        currentStock,
        minQuantity: product.minQuantity,
        weeklyAvgQty,
        weeklyAvgValue,
        suggestedQty,
        estimatedCost: suggestedQty * product.averageCost,
        daysUntilStockout,
        weeksOfStockLeft,
        urgency,
        reason: buildReason(
          urgency,
          currentStock,
          weeklyAvgQty,
          suggestedQty,
          getUnitLabel(product.unit)
        ),
      };
    })
    .filter((s) => s.urgency !== "ok" || s.suggestedQty > 0)
    .sort((a, b) => {
      const urgencyOrder: Record<Urgency, number> = {
        urgent: 0,
        soon: 1,
        planned: 2,
        ok: 3,
      };
      const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (diff !== 0) return diff;
      return b.estimatedCost - a.estimatedCost;
    });

  return {
    periodWeeks: weeks,
    periodStart,
    periodEnd,
    totalQuantityUsed,
    totalValueUsed,
    weeklyAvgQuantity: (totalQuantityUsed / periodDays) * 7,
    weeklyAvgValue: (totalValueUsed / periodDays) * 7,
    productCount: allUsage.filter((p) => p.quantityUsed > 0).length,
    fastMovers,
    allUsage: allUsage.filter((p) => p.quantityUsed > 0),
    purchaseSuggestions: purchaseSuggestions.filter((s) => s.suggestedQty > 0),
    totalSuggestedCost: purchaseSuggestions
      .filter((s) => s.suggestedQty > 0)
      .reduce((s, p) => s + p.estimatedCost, 0),
    urgentCount: purchaseSuggestions.filter((s) => s.urgency === "urgent").length,
  };
}
