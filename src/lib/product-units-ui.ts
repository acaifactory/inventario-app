import { getUnitLabel } from "@/lib/utils";
import type { ProductOption } from "@/components/ui/ProductSearch";
import type { UnitOption } from "@/components/forms/UnitQuantityInput";

export function getUnitOptionsForProduct(product?: ProductOption): UnitOption[] {
  if (!product) return [];

  if (product.units?.length) {
    const sorted = [...product.units].sort((a, b) => {
      if (a.unit === product.unit) return -1;
      if (b.unit === product.unit) return 1;
      return a.unit.localeCompare(b.unit);
    });
    return sorted.map((u) => ({
      unit: u.unit,
      label: u.label ?? getUnitLabel(u.unit),
      conversionFactor: u.conversionFactor,
    }));
  }

  if (product.unit) {
    return [
      {
        unit: product.unit,
        label: getUnitLabel(product.unit),
        conversionFactor: 1,
      },
    ];
  }

  return [{ unit: "UNIT", label: "Unidad", conversionFactor: 1 }];
}

export function defaultUnitForProduct(product?: ProductOption) {
  if (product?.unit) return product.unit;
  return getUnitOptionsForProduct(product)[0]?.unit ?? "UNIT";
}

export function conversionFactorForProduct(
  product: ProductOption | undefined,
  unit: string
): number | null {
  if (!product) return null;
  if (product.unit === unit) return 1;
  const row = product.units?.find((u) => u.unit === unit);
  return row?.conversionFactor ?? null;
}

export function convertBaseToUnit(
  baseQuantity: number,
  product: ProductOption | undefined,
  unit: string
): number | null {
  const factor = conversionFactorForProduct(product, unit);
  if (factor == null || factor === 0) return null;
  return baseQuantity / factor;
}
