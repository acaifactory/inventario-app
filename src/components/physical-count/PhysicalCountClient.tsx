"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  PHYSICAL_COUNT_COLUMNS,
  type PhysicalCountUnit,
} from "@/lib/constants";
import {
  computePhysicalCountDifference,
  computePhysicalCountResult,
  columnLabel,
  countUnitNeedsFactorInput,
  inventoryLineValue,
  parseCountedUnits,
  parseUnitFactors,
  suggestedFactorForCountUnit,
  updateCountedUnit,
  updateUnitFactor,
  type CountedUnitsMap,
  type UnitFactorsMap,
} from "@/lib/inventory/physical-count";
import { formatNumber, getUnitLabel, formatCurrency } from "@/lib/utils";
import type { UnitOfMeasure } from "@prisma/client";

interface CountItem {
  id: string;
  expectedQuantity: number;
  countedUnits: unknown;
  countedUnitFactors: unknown;
  countedQuantity: number | null;
  difference: number | null;
  product: {
    id: string;
    name: string;
    unit: UnitOfMeasure;
    averageCost: number;
    units?: {
      unit: UnitOfMeasure;
      conversionFactor: number;
      label?: string | null;
    }[];
    category: { name: string };
  };
}

interface PhysicalCount {
  id: string;
  name: string;
  status: string;
  items: CountItem[];
}

function itemWithTotals(item: CountItem): CountItem & {
  unitCounts: CountedUnitsMap;
  unitFactors: UnitFactorsMap;
  missingUnits: PhysicalCountUnit[];
} {
  const unitCounts = parseCountedUnits(item.countedUnits);
  const unitFactors = parseUnitFactors(item.countedUnitFactors);
  const result = computePhysicalCountResult(
    item.product,
    unitCounts,
    unitFactors
  );
  const countedQuantity = result.total;
  return {
    ...item,
    unitCounts,
    unitFactors,
    missingUnits: result.missingUnits,
    countedQuantity,
    difference: computePhysicalCountDifference(
      item.expectedQuantity,
      countedQuantity
    ),
  };
}

export function PhysicalCountClient() {
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState("");
  const [count, setCount] = useState<PhysicalCount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then(setStores);
  }, []);

  async function startCount() {
    if (!storeId) return;
    setLoading(true);
    const res = await fetch("/api/physical-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        storeId,
        name: `Conteo ${new Date().toLocaleDateString("es")}`,
      }),
    });
    const data = await res.json();
    setCount(data);
    setLoading(false);
  }

  async function savePartial() {
    if (!count) return;
    setLoading(true);
    const res = await fetch("/api/physical-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        physicalCountId: count.id,
        items: count.items.map((i) => ({
          id: i.id,
          countedUnits: parseCountedUnits(i.countedUnits),
          countedUnitFactors: parseUnitFactors(i.countedUnitFactors),
        })),
      }),
    });
    const data = await res.json();
    setCount(data);
    setLoading(false);
  }

  async function finalize() {
    if (!count) return;
    setLoading(true);
    const res = await fetch("/api/physical-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "finalize",
        physicalCountId: count.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "No se pudo finalizar");
      setLoading(false);
      return;
    }
    setCount(data);
    setLoading(false);
  }

  function updateItemUnit(id: string, unit: PhysicalCountUnit, value: string) {
    if (!count) return;
    setCount({
      ...count,
      items: count.items.map((item) => {
        if (item.id !== id) return item;
        const unitCounts = updateCountedUnit(
          parseCountedUnits(item.countedUnits),
          unit,
          value
        );
        let unitFactors = parseUnitFactors(item.countedUnitFactors);
        if (value === "" || Number(value) <= 0) {
          const nextFactors = { ...unitFactors };
          delete nextFactors[unit];
          unitFactors = nextFactors;
        } else if (
          countUnitNeedsFactorInput(item.product, unit) &&
          unitFactors[unit] == null
        ) {
          const suggested = suggestedFactorForCountUnit(item.product, unit);
          if (suggested != null) {
            unitFactors = { ...unitFactors, [unit]: suggested };
          }
        }
        return itemWithTotals({
          ...item,
          countedUnits: unitCounts,
          countedUnitFactors: unitFactors,
        });
      }),
    });
  }

  function updateItemFactor(
    id: string,
    unit: PhysicalCountUnit,
    value: string
  ) {
    if (!count) return;
    setCount({
      ...count,
      items: count.items.map((item) => {
        if (item.id !== id) return item;
        const unitFactors = updateUnitFactor(
          parseUnitFactors(item.countedUnitFactors),
          item.product,
          unit,
          value
        );
        return itemWithTotals({
          ...item,
          countedUnitFactors: unitFactors,
        });
      }),
    });
  }

  const grouped = count?.items.reduce<Record<string, CountItem[]>>(
    (acc, item) => {
      const cat = item.product.category.name;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {}
  );

  const isCompleted = count?.status === "COMPLETED";

  return (
    <div className="space-y-6">
      {!count && (
        <Card className="max-w-xl">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Cuenta en <strong>Libras</strong>, <strong>Manga</strong>,{" "}
              <strong>Each</strong>, <strong>Broken box</strong> o{" "}
              <strong>Box</strong>. Si el empaque no es la unidad base del
              producto, indica <strong>cuánto contiene</strong> cada unidad
              contada (igual que en facturas de compra).
            </p>
            <StoreSearch
              label="Tienda del conteo"
              value={storeId}
              onChange={setStoreId}
              stores={stores}
              required
            />
            <Button
              onClick={startCount}
              disabled={loading || !storeId}
              size="lg"
            >
              {loading ? "Creando..." : "Iniciar conteo físico"}
            </Button>
          </div>
        </Card>
      )}

      {count && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={savePartial}
              variant="secondary"
              disabled={loading || isCompleted}
            >
              Guardar parcial
            </Button>
            <Button onClick={finalize} disabled={loading || isCompleted}>
              Finalizar conteo
            </Button>
            <Badge variant={isCompleted ? "success" : "info"}>
              {count.status}
            </Badge>
          </div>

          {Object.entries(grouped ?? {}).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="min-w-[180px] py-2 pr-3 font-medium">
                        Producto
                      </th>
                      <th className="min-w-[88px] px-2 py-2 font-medium">
                        Esperado
                      </th>
                      {PHYSICAL_COUNT_COLUMNS.map((col) => (
                        <th
                          key={col.unit}
                          className="min-w-[100px] px-2 py-2 font-medium"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="min-w-[88px] px-2 py-2 font-medium">
                        Contado
                      </th>
                      <th className="min-w-[88px] px-2 py-2 font-medium">
                        Diferencia
                      </th>
                      <th className="min-w-[96px] px-2 py-2 font-medium">
                        Valor contado
                      </th>
                      <th className="min-w-[96px] px-2 py-2 font-medium">
                        Dif. $
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((rawItem) => {
                      const item = itemWithTotals(rawItem);
                      const baseUnit = getUnitLabel(item.product.unit);
                      const unitCost = item.product.averageCost ?? 0;
                      const expectedValue = inventoryLineValue(
                        item.expectedQuantity,
                        unitCost
                      );
                      const countedValue = inventoryLineValue(
                        item.countedQuantity,
                        unitCost
                      );
                      const diffValue =
                        item.difference != null && item.missingUnits.length === 0
                          ? item.difference * unitCost
                          : null;

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 align-top last:border-0"
                        >
                          <td className="py-2 pr-3">
                            <p className="font-medium text-slate-900">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              Base: {baseUnit} · {formatCurrency(unitCost)}/
                              {baseUnit}
                            </p>
                            {item.missingUnits.length > 0 ? (
                              <p className="mt-1 text-xs text-amber-700">
                                Falta factor en:{" "}
                                {item.missingUnits
                                  .map((u) => columnLabel(item.product, u))
                                  .join(", ")}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 text-slate-700">
                            {formatNumber(item.expectedQuantity)}
                            <span className="ml-1 text-xs text-slate-400">
                              {baseUnit}
                            </span>
                            {expectedValue != null ? (
                              <p className="text-xs text-slate-500">
                                {formatCurrency(expectedValue)}
                              </p>
                            ) : null}
                          </td>
                          {PHYSICAL_COUNT_COLUMNS.map((col) => {
                            const qty = item.unitCounts[col.unit];
                            const needsFactor = countUnitNeedsFactorInput(
                              item.product,
                              col.unit
                            );
                            const showFactor =
                              needsFactor && qty != null && qty > 0;
                            const colLabel = columnLabel(item.product, col.unit);

                            return (
                              <td key={col.unit} className="px-2 py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-9 min-w-[72px] px-2 text-sm"
                                  value={qty ?? ""}
                                  onChange={(e) =>
                                    updateItemUnit(
                                      item.id,
                                      col.unit,
                                      e.target.value
                                    )
                                  }
                                  disabled={isCompleted}
                                  placeholder="0"
                                />
                                {showFactor ? (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                                    <span>×</span>
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      className="h-7 w-14 px-1 text-xs"
                                      value={item.unitFactors[col.unit] ?? ""}
                                      onChange={(e) =>
                                        updateItemFactor(
                                          item.id,
                                          col.unit,
                                          e.target.value
                                        )
                                      }
                                      disabled={isCompleted}
                                      placeholder="?"
                                      title={`Cuántas ${baseUnit} contiene cada ${colLabel}`}
                                    />
                                    <span>{baseUnit}</span>
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 font-medium text-slate-800">
                            {item.countedQuantity != null ? (
                              <>
                                {formatNumber(item.countedQuantity)}
                                <span className="ml-1 text-xs font-normal text-slate-400">
                                  {baseUnit}
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td
                            className={`px-2 py-2 font-medium ${
                              item.missingUnits.length > 0
                                ? "text-amber-600"
                                : (item.difference ?? 0) < 0
                                  ? "text-red-600"
                                  : (item.difference ?? 0) > 0
                                    ? "text-emerald-600"
                                    : "text-slate-700"
                            }`}
                          >
                            {item.missingUnits.length > 0
                              ? "—"
                              : item.difference != null
                                ? formatNumber(item.difference)
                                : "—"}
                          </td>
                          <td className="px-2 py-2 font-medium text-slate-800">
                            {countedValue != null
                              ? formatCurrency(countedValue)
                              : "—"}
                          </td>
                          <td
                            className={`px-2 py-2 font-medium ${
                              diffValue != null && diffValue < 0
                                ? "text-red-600"
                                : diffValue != null && diffValue > 0
                                  ? "text-emerald-600"
                                  : "text-slate-700"
                            }`}
                          >
                            {diffValue != null ? formatCurrency(diffValue) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
