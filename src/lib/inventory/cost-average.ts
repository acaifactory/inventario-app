import type { Prisma } from "@prisma/client";

/**
 * Promedio de las últimas N compras (entradas con costo).
 */
export function averageLastPurchases(
  unitCosts: number[],
  count = 4
): number {
  if (unitCosts.length === 0) return 0;
  const slice = unitCosts.slice(0, count);
  return slice.reduce((sum, c) => sum + c, 0) / slice.length;
}

export async function recalculateProductAverageCost(
  tx: Prisma.TransactionClient,
  productId: string
) {
  const history = await tx.costHistory.findMany({
    where: { productId },
    orderBy: { date: "desc" },
    take: 4,
  });

  if (history.length === 0) return null;

  const avg = averageLastPurchases(history.map((h) => h.unitCost));
  const latest = history[0];

  await tx.product.update({
    where: { id: productId },
    data: {
      averageCost: avg,
      lastPurchaseCost: latest.unitCost,
      lastPurchaseDate: latest.date,
    },
  });

  return { averageCost: avg, lastPurchaseCost: latest.unitCost };
}

/** @deprecated usar recalculateProductAverageCost */
export function calculateWeightedAverageCost(
  currentQty: number,
  currentAvgCost: number,
  incomingQty: number,
  incomingUnitCost: number
): number {
  if (incomingQty <= 0) return currentAvgCost;
  if (currentQty <= 0) return incomingUnitCost;
  const totalValue =
    currentQty * currentAvgCost + incomingQty * incomingUnitCost;
  return totalValue / (currentQty + incomingQty);
}
