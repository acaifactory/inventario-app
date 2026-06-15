import type { FinancialClassification, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function stockKey(productId: string, locationId: string) {
  return `${productId}::${locationId}`;
}

type ProductFilter = {
  classifications?: FinancialClassification[];
  includeInFoodCost?: boolean;
};

function matchesProductFilter(
  product: {
    financialClassification: FinancialClassification;
    includeInFoodCost: boolean;
  },
  filter: ProductFilter
) {
  if (
    filter.classifications &&
    !filter.classifications.includes(product.financialClassification)
  ) {
    return false;
  }
  if (
    filter.includeInFoodCost != null &&
    product.includeInFoodCost !== filter.includeInFoodCost
  ) {
    return false;
  }
  return true;
}

/**
 * Valor del inventario en una fecha histórica.
 * Reconstruye cantidades restando movimientos posteriores a `at`.
 */
export async function inventoryValueAt(
  at: Date,
  storeId?: string,
  filter: ProductFilter = {}
) {
  const locationWhere: Prisma.ProductStockWhereInput = storeId
    ? { location: { storeId } }
    : {};

  const stocks = await prisma.productStock.findMany({
    where: locationWhere,
    include: { product: true },
  });

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      date: { gt: at },
      isReversal: false,
      reversedAt: null,
      stockBefore: { not: null },
      stockAfter: { not: null },
      ...(storeId ? { location: { storeId } } : {}),
    },
    select: {
      productId: true,
      locationId: true,
      stockBefore: true,
      stockAfter: true,
    },
  });

  const deltaAfter = new Map<string, number>();
  for (const m of movements) {
    const key = stockKey(m.productId, m.locationId);
    const delta = (m.stockAfter ?? 0) - (m.stockBefore ?? 0);
    deltaAfter.set(key, (deltaAfter.get(key) ?? 0) + delta);
  }

  const stockByKey = new Map(
    stocks.map((s) => [stockKey(s.productId, s.locationId), s])
  );

  const productIds = new Set<string>();
  for (const s of stocks) productIds.add(s.productId);
  for (const m of movements) productIds.add(m.productId);

  const extraProducts =
    productIds.size > 0
      ? await prisma.product.findMany({
          where: { id: { in: [...productIds] } },
        })
      : [];
  const productById = new Map(extraProducts.map((p) => [p.id, p]));
  for (const s of stocks) productById.set(s.productId, s.product);

  const keys = new Set<string>();
  for (const s of stocks) keys.add(stockKey(s.productId, s.locationId));
  for (const m of movements) keys.add(stockKey(m.productId, m.locationId));

  let total = 0;
  for (const key of keys) {
    const [productId, locationId] = key.split("::");
    const product = productById.get(productId);
    if (!product || !matchesProductFilter(product, filter)) continue;

    const currentQty = stockByKey.get(key)?.quantity ?? 0;
    const historicalQty = currentQty - (deltaAfter.get(key) ?? 0);
    if (historicalQty <= 0) continue;

    total += historicalQty * product.averageCost;
  }

  return total;
}
