import type { UnitOfMeasure } from "@prisma/client";
import {
  PHYSICAL_COUNT_COLUMNS,
  type PhysicalCountUnit,
} from "@/lib/constants";
import { getUnitLabel } from "@/lib/utils";

export type PhysicalCountProduct = {
  unit: UnitOfMeasure;
  units?: {
    unit: UnitOfMeasure;
    conversionFactor: number;
    label?: string | null;
  }[];
};

export type CountedUnitsMap = Partial<Record<PhysicalCountUnit, number>>;
export type UnitFactorsMap = Partial<Record<PhysicalCountUnit, number>>;

export function parseCountedUnits(raw: unknown): CountedUnitsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: CountedUnitsMap = {};
  for (const col of PHYSICAL_COUNT_COLUMNS) {
    const value = (raw as Record<string, unknown>)[col.unit];
    if (value == null || value === "") continue;
    const num = Number(value);
    if (!Number.isNaN(num) && num >= 0) out[col.unit] = num;
  }
  return out;
}

export function parseUnitFactors(raw: unknown): UnitFactorsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: UnitFactorsMap = {};
  for (const col of PHYSICAL_COUNT_COLUMNS) {
    const value = (raw as Record<string, unknown>)[col.unit];
    if (value == null || value === "") continue;
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) out[col.unit] = num;
  }
  return out;
}

export function serializeCountedUnits(counts: CountedUnitsMap): CountedUnitsMap {
  const out: CountedUnitsMap = {};
  for (const col of PHYSICAL_COUNT_COLUMNS) {
    const qty = counts[col.unit];
    if (qty != null && qty > 0) out[col.unit] = qty;
  }
  return out;
}

export function serializeUnitFactors(factors: UnitFactorsMap): UnitFactorsMap {
  const out: UnitFactorsMap = {};
  for (const col of PHYSICAL_COUNT_COLUMNS) {
    const factor = factors[col.unit];
    if (factor != null && factor > 0) out[col.unit] = factor;
  }
  return out;
}

export function suggestedFactorForCountUnit(
  product: PhysicalCountProduct,
  unit: PhysicalCountUnit
): number | null {
  if (product.unit === unit) return 1;
  const row = product.units?.find((u) => u.unit === unit);
  if (row && row.conversionFactor > 0) return row.conversionFactor;
  return null;
}

export function conversionFactorToBase(
  product: PhysicalCountProduct,
  unit: UnitOfMeasure,
  factors?: UnitFactorsMap
): number | null {
  if (product.unit === unit) return 1;
  const override = factors?.[unit as PhysicalCountUnit];
  if (override != null && override > 0) return override;
  const row = product.units?.find((u) => u.unit === unit);
  return row?.conversionFactor ?? null;
}

export function columnLabel(
  product: PhysicalCountProduct,
  unit: PhysicalCountUnit
) {
  const col = PHYSICAL_COUNT_COLUMNS.find((c) => c.unit === unit);
  const custom = product.units?.find((u) => u.unit === unit)?.label;
  return custom ?? col?.label ?? getUnitLabel(unit);
}

export function isCountUnitConfigured(
  product: PhysicalCountProduct,
  unit: PhysicalCountUnit,
  factors?: UnitFactorsMap
) {
  return conversionFactorToBase(product, unit, factors) != null;
}

export function countUnitNeedsFactorInput(
  product: PhysicalCountProduct,
  unit: PhysicalCountUnit
) {
  return product.unit !== unit;
}

export type PhysicalCountResult = {
  total: number | null;
  missingUnits: PhysicalCountUnit[];
  hasEntries: boolean;
};

export function computePhysicalCountResult(
  product: PhysicalCountProduct,
  counts: CountedUnitsMap,
  factors?: UnitFactorsMap
): PhysicalCountResult {
  let total = 0;
  let hasConfigured = false;
  let hasEntries = false;
  const missingUnits: PhysicalCountUnit[] = [];

  for (const col of PHYSICAL_COUNT_COLUMNS) {
    const qty = counts[col.unit];
    if (qty == null || qty <= 0) continue;
    hasEntries = true;
    const factor = conversionFactorToBase(product, col.unit, factors);
    if (factor == null) {
      missingUnits.push(col.unit);
      continue;
    }
    hasConfigured = true;
    total += qty * factor;
  }

  return {
    total: hasConfigured ? total : null,
    missingUnits,
    hasEntries,
  };
}

export function computePhysicalCountDifference(
  expectedQuantity: number,
  countedQuantity: number | null
) {
  return countedQuantity != null ? countedQuantity - expectedQuantity : null;
}

export function inventoryLineValue(
  quantity: number | null | undefined,
  unitCost: number
) {
  if (quantity == null) return null;
  return quantity * unitCost;
}

export function updateCountedUnit(
  counts: CountedUnitsMap,
  unit: PhysicalCountUnit,
  value: string
): CountedUnitsMap {
  const next = { ...counts };
  if (value === "") {
    delete next[unit];
  } else {
    const num = Number(value);
    if (!Number.isNaN(num) && num >= 0) next[unit] = num;
  }
  return next;
}

export function updateUnitFactor(
  factors: UnitFactorsMap,
  product: PhysicalCountProduct,
  unit: PhysicalCountUnit,
  value: string
): UnitFactorsMap {
  const next = { ...factors };
  if (value === "") {
    delete next[unit];
    const suggested = suggestedFactorForCountUnit(product, unit);
    if (suggested != null) next[unit] = suggested;
  } else {
    const num = Number(value);
    if (!Number.isNaN(num) && num > 0) next[unit] = num;
  }
  return next;
}

/** Unidades del producto que coinciden con la hoja de conteo. */
export function physicalCountUnitsForProduct(
  product: PhysicalCountProduct,
  factors?: UnitFactorsMap
) {
  return PHYSICAL_COUNT_COLUMNS.map((col) => ({
    ...col,
    label: columnLabel(product, col.unit),
    configured: isCountUnitConfigured(product, col.unit, factors),
    factor: conversionFactorToBase(product, col.unit, factors),
    needsFactorInput: countUnitNeedsFactorInput(product, col.unit),
  }));
}
