import type { FinancialClassification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { financialClassificationLabel } from "@/lib/constants";

const COGS_CLASSIFICATIONS: FinancialClassification[] = [
  "FOOD_COST",
  "PACKAGING_COST",
];

export async function getValuationSummary(
  locationId?: string,
  storeId?: string
) {
  const stocks = await prisma.productStock.findMany({
    where: {
      quantity: { gt: 0 },
      ...(locationId ? { locationId } : {}),
      ...(storeId ? { location: { storeId } } : {}),
    },
    include: {
      product: { include: { category: true } },
      location: { include: { store: true } },
    },
  });

  const byProduct = stocks.map((s) => ({
    productId: s.productId,
    productName: s.product.name,
    category: s.product.category.name,
    subcategory: s.product.subcategory,
    financialClassification: s.product.financialClassification,
    financialLabel: financialClassificationLabel(
      s.product.financialClassification
    ),
    includeInFoodCost: s.product.includeInFoodCost,
    location: s.location.name,
    store: s.location.store?.name ?? null,
    quantity: s.quantity,
    unitCost: s.product.averageCost,
    value: s.quantity * s.product.averageCost,
    unit: s.product.unit,
  }));

  const sumByClass = (classification: FinancialClassification) =>
    byProduct
      .filter((p) => p.financialClassification === classification)
      .reduce((sum, p) => sum + p.value, 0);

  const foodCostValue = sumByClass("FOOD_COST");
  const packagingCostValue = sumByClass("PACKAGING_COST");
  const cogsValue = foodCostValue + packagingCostValue;
  const cleaningValue = sumByClass("CLEANING_SUPPLIES");
  const operatingValue = sumByClass("OPERATING_SUPPLIES");
  const otherValue = sumByClass("OTHER");
  const totalValue = byProduct.reduce((sum, p) => sum + p.value, 0);

  const byCategory = Object.values(
    byProduct.reduce<Record<string, { category: string; value: number }>>(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { category: item.category, value: 0 };
        }
        acc[item.category].value += item.value;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.value - a.value);

  const byFinancial = Object.values(
    byProduct.reduce<
      Record<
        string,
        { classification: string; label: string; value: number; inCogs: boolean }
      >
    >((acc, item) => {
      const key = item.financialClassification;
      if (!acc[key]) {
        acc[key] = {
          classification: key,
          label: item.financialLabel,
          value: 0,
          inCogs: COGS_CLASSIFICATIONS.includes(
            item.financialClassification as FinancialClassification
          ),
        };
      }
      acc[key].value += item.value;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const byLocation = Object.values(
    byProduct.reduce<Record<string, { location: string; store: string | null; value: number }>>(
      (acc, item) => {
        const key = `${item.store ?? ""}|${item.location}`;
        if (!acc[key]) {
          acc[key] = {
            location: item.location,
            store: item.store,
            value: 0,
          };
        }
        acc[key].value += item.value;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.value - a.value);

  const byStore = Object.values(
    byProduct.reduce<Record<string, { store: string; value: number }>>(
      (acc, item) => {
        const storeName = item.store ?? "Sin tienda";
        if (!acc[storeName]) {
          acc[storeName] = { store: storeName, value: 0 };
        }
        acc[storeName].value += item.value;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.value - a.value);

  const cogsProducts = byProduct.filter((p) =>
    COGS_CLASSIFICATIONS.includes(
      p.financialClassification as FinancialClassification
    )
  );

  return {
    totalValue,
    foodCostValue,
    packagingCostValue,
    cogsValue,
    cleaningValue,
    operatingValue,
    otherValue,
    byProduct,
    byCategory,
    byFinancial,
    byLocation,
    byStore,
    cogsProducts,
  };
}
