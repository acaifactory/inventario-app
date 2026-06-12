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

export function serializeCountedUnits(counts: CountedUnitsMap): CountedUnitsMap {
  const out: CountedUnitsMap = {};
  for (const col of PHYSICAL_COUNT_COLUMNS) {
    const qty = counts[col.unit];
    if (qty != null && qty > 0) out[col.unit] = qty;
  }
  return out;
}

export function conversionFactorToBase(
  product: PhysicalCountProduct,
  unit: UnitOfMeasure
): number | null {
  if (product.unit === unit) return 1;
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
  unit: PhysicalCountUnit
) {
  return conversionFactorToBase(product, unit) != null;
}

export type PhysicalCountResult = {
  total: number | null;
  missingUnits: PhysicalCountUnit[];
  hasEntries: boolean;
};

export function computePhysicalCountResult(
  product: PhysicalCountProduct,
  counts: CountedUnitsMap
): PhysicalCountResult {
  let total = 0;
  let hasConfigured = false;
  let hasEntries = false;
  const missingUnits: PhysicalCountUnit[] = [];

  for (const col of PHYSICAL_COUNT_COLUMNS) {
    const qty = counts[col.unit];
    if (qty == null || qty <= 0) continue;
    hasEntries = true;
    const factor = conversionFactorToBase(product, col.unit);
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

/** Unidades del producto que coinciden con la hoja de conteo. */
export function physicalCountUnitsForProduct(product: PhysicalCountProduct) {
  return PHYSICAL_COUNT_COLUMNS.map((col) => ({
    ...col,
    label: columnLabel(product, col.unit),
    configured: isCountUnitConfigured(product, col.unit),
    factor: conversionFactorToBase(product, col.unit),
  }));
}
