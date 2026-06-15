import { getUnitLabel } from "@/lib/utils";
import { PURCHASE_PACKAGING_UNITS } from "@/lib/constants";
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

export type PurchaseUnitOption = {
  unit: string;
  label: string;
};

/** Unidades de compra universales; el factor se define en cada factura. */
export function getPurchaseUnitOptionsForProduct(
  product?: ProductOption
): PurchaseUnitOption[] {
  const base = product?.unit ?? "UNIT";
  const seen = new Set<string>();
  const options: PurchaseUnitOption[] = [];

  function add(unit: string, label: string) {
    if (seen.has(unit)) return;
    seen.add(unit);
    options.push({ unit, label });
  }

  add(base, getUnitLabel(base));

  for (const row of PURCHASE_PACKAGING_UNITS) {
    add(row.value, row.label);
  }

  return options.sort((a, b) => {
    if (a.unit === base) return -1;
    if (b.unit === base) return 1;
    return a.label.localeCompare(b.label, "es");
  });
}

export function purchaseUnitNeedsConversion(
  product: ProductOption | undefined,
  unit: string
) {
  if (!product?.unit) return false;
  return unit !== product.unit;
}

/** Sugerencia opcional desde configuración del producto (editable en la factura). */
export function suggestedContentsPerUnit(
  product: ProductOption | undefined,
  unit: string
): number | null {
  if (!product || !purchaseUnitNeedsConversion(product, unit)) return null;
  const row = product.units?.find((u) => u.unit === unit);
  if (row && row.conversionFactor > 0) return row.conversionFactor;
  return null;
}

export function defaultPurchaseUnitForProduct(product?: ProductOption) {
  return product?.unit ?? "UNIT";
}

/** Cantidad en unidad base a partir de línea con conversión dinámica (UI). */
export function computeBaseQuantityFromLine(
  product: ProductOption | undefined,
  quantity: number,
  unit: string,
  contentsPerUnit?: number | string
): number | null {
  if (!product || quantity <= 0) return null;
  if (!purchaseUnitNeedsConversion(product, unit)) return quantity;
  const factor = Number(contentsPerUnit);
  if (!factor || factor <= 0) return null;
  return quantity * factor;
}

export function contentsPerUnitForSubmit(
  product: ProductOption | undefined,
  unit: string,
  contentsPerUnit: string
): number | undefined {
  if (!purchaseUnitNeedsConversion(product, unit)) return undefined;
  return Number(contentsPerUnit);
}

export function validateDynamicLineConversion(
  product: ProductOption | undefined,
  unit: string,
  contentsPerUnit: string,
  lineLabel = "Línea"
): string | null {
  if (!product) return null;
  if (
    purchaseUnitNeedsConversion(product, unit) &&
    (!contentsPerUnit || Number(contentsPerUnit) <= 0)
  ) {
    return `${lineLabel}: indica cuánto contiene cada ${getUnitLabel(unit)} en ${getUnitLabel(product.unit ?? "UNIT")}.`;
  }
  return null;
}

export function onDynamicUnitChange(
  product: ProductOption | undefined,
  unit: string
): { contentsPerUnit: string } {
  const needs = purchaseUnitNeedsConversion(product, unit);
  const suggested = suggestedContentsPerUnit(product, unit);
  return {
    contentsPerUnit: needs
      ? suggested != null
        ? String(suggested)
        : ""
      : "",
  };
}
