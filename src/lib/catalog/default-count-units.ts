import type { UnitOfMeasure } from "@prisma/client";

export type CountUnitDef = {
  unit: UnitOfMeasure;
  conversionFactor: number;
  label?: string;
};

/** Conversiones por defecto para la hoja de conteo físico (unidad → unidad base). */
export function defaultCountUnitsForBase(
  base: UnitOfMeasure
): CountUnitDef[] {
  const templates: Partial<Record<UnitOfMeasure, CountUnitDef[]>> = {
    BAG: [
      { unit: "LB", conversionFactor: 0.25, label: "Libras" },
      { unit: "CASE", conversionFactor: 20, label: "Manga" },
      { unit: "UNIT", conversionFactor: 1, label: "Each" },
      { unit: "BROKEN_CASE", conversionFactor: 10, label: "Broken box" },
      { unit: "BOX", conversionFactor: 5, label: "Box" },
    ],
    LB: [
      { unit: "CASE", conversionFactor: 24, label: "Manga" },
      { unit: "UNIT", conversionFactor: 1, label: "Each" },
      { unit: "BROKEN_CASE", conversionFactor: 12, label: "Broken box" },
      { unit: "BOX", conversionFactor: 10, label: "Box" },
    ],
    BOX: [
      { unit: "LB", conversionFactor: 0.1, label: "Libras" },
      { unit: "CASE", conversionFactor: 6, label: "Manga" },
      { unit: "UNIT", conversionFactor: 1, label: "Each" },
      { unit: "BROKEN_CASE", conversionFactor: 3, label: "Broken box" },
    ],
    PACK: [
      { unit: "LB", conversionFactor: 0.5, label: "Libras" },
      { unit: "CASE", conversionFactor: 12, label: "Manga" },
      { unit: "UNIT", conversionFactor: 1, label: "Each" },
      { unit: "BROKEN_CASE", conversionFactor: 6, label: "Broken box" },
      { unit: "BOX", conversionFactor: 6, label: "Box" },
    ],
    GALLON: [
      { unit: "UNIT", conversionFactor: 1, label: "Each" },
      { unit: "BOX", conversionFactor: 4, label: "Box" },
    ],
    UNIT: [
      { unit: "BOX", conversionFactor: 12, label: "Box" },
      { unit: "CASE", conversionFactor: 24, label: "Manga" },
    ],
  };

  return (templates[base] ?? []).filter((u) => u.unit !== base);
}
