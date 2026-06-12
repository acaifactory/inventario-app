"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { exportToCSV } from "@/lib/export/csv";

const REPORT_GROUPS = [
  {
    label: "Inventario",
    types: [
      { value: "current", label: "Inventario actual" },
      { value: "valued", label: "Inventario valorizado" },
      { value: "low-stock", label: "Bajo mínimo" },
      { value: "expiring", label: "Por vencer" },
    ],
  },
  {
    label: "Movimientos",
    types: [
      { value: "entries", label: "Entradas" },
      { value: "exits", label: "Salidas" },
      { value: "transfers", label: "Transferencias" },
      { value: "adjustments", label: "Ajustes" },
      { value: "waste", label: "Desperdicio" },
    ],
  },
  {
    label: "Compras",
    types: [
      { value: "purchases", label: "Historial de compras / facturas" },
    ],
  },
  {
    label: "Préstamos",
    types: [{ value: "loans", label: "Préstamos IN / OUT" }],
  },
  {
    label: "Costos",
    types: [
      { value: "costs", label: "Food Cost, Packaging y períodos" },
      { value: "valued", label: "Inventario valorizado (detalle)" },
    ],
  },
  {
    label: "Análisis",
    types: [
      { value: "consumption", label: "Consumo por producto" },
      { value: "count-differences", label: "Diferencias de conteo" },
    ],
  },
] as const;

export function ReportsClient() {
  const [type, setType] = useState("current");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/reports?${params}`);
    const result = await res.json();
    if (Array.isArray(result)) {
      setData(result);
    } else if (result.byProduct) {
      setData(result.byProduct);
    } else if (result.byFinancial) {
      setData(result.byFinancial);
    } else if (result.error) {
      setData([]);
    } else {
      setData([result]);
    }
    setLoading(false);
  }

  function handleExport() {
    if (!data.length) return;
    const flat = data.map((item) => flatten(item as Record<string, unknown>));
    exportToCSV(flat, `reporte-${type}`);
  }

  function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, flatten(value as Record<string, unknown>, `${prefix}${key}.`));
      } else {
        result[`${prefix}${key}`] = value;
      }
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generar reporte</CardTitle>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {REPORT_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.types.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={generate} disabled={loading} className="flex-1">
              {loading ? "Generando..." : "Generar"}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!data.length}>
              Exportar
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({data.length})</CardTitle>
        </CardHeader>
        <pre className="max-h-96 overflow-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
