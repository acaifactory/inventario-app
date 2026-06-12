import type { UnitOfMeasure } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUnitLabel } from "@/lib/utils";

export type ProductUnitOption = {
  unit: UnitOfMeasure;
  conversionFactor: number;
  label: string;
  isBase: boolean;
};

export async function getProductUnits(productId: string): Promise<ProductUnitOption[]> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { units: true },
  });

  if (product.units.length === 0) {
    return [
      {
        unit: product.unit,
        conversionFactor: 1,
        label: getUnitLabel(product.unit),
        isBase: true,
      },
    ];
  }

  return product.units.map((u) => ({
    unit: u.unit,
    conversionFactor: u.conversionFactor,
    label: u.label ?? getUnitLabel(u.unit),
    isBase: u.unit === product.unit && u.conversionFactor === 1,
  }));
}

export async function resolveQuantityToBase(
  productId: string,
  unit: UnitOfMeasure,
  quantity: number
) {
  if (quantity <= 0) throw new Error("INVALID_QUANTITY");

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { units: true },
  });

  let factor = 1;
  if (unit === product.unit) {
    const row = product.units.find((u) => u.unit === unit);
    factor = row?.conversionFactor ?? 1;
  } else {
    const row = product.units.find((u) => u.unit === unit);
    if (!row) throw new Error("INVALID_UNIT");
    factor = row.conversionFactor;
  }

  return {
    baseQuantity: quantity * factor,
    registeredUnit: unit,
    registeredQuantity: quantity,
    baseUnit: product.unit,
  };
}

export async function ensureBaseProductUnit(productId: string, unit: UnitOfMeasure) {
  await prisma.productUnit.upsert({
    where: { productId_unit: { productId, unit } },
    create: { productId, unit, conversionFactor: 1 },
    update: {},
  });
}
