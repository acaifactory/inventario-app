"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { exportToCSV } from "@/lib/export/csv";
import { printReport } from "@/lib/export/report-print";
import {
  REPORT_DISPLAY_COLUMNS,
  formatReportCell,
  normalizeReportRows,
  reportTitle,
} from "@/lib/reports/report-columns";

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
    types: [{ value: "costs", label: "Food Cost y períodos" }],
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
  const [rawData, setRawData] = useState<unknown>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rows = normalizeReportRows(type, rawData);
  const columns = REPORT_DISPLAY_COLUMNS[type] ?? [
    { key: "value", label: "Dato" },
  ];

  async function generate() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/reports?${params}`, { cache: "no-store" });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "No se pudo generar el reporte");
        setRawData([]);
        return;
      }
      setRawData(result);
    } catch {
      setError("Error de conexión al generar el reporte.");
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!rows.length) return;
    const flat = rows.map((item) => flatten(item));
    exportToCSV(flat, `reporte-${type}-completo`);
  }

  function handlePrint() {
    if (!rows.length) return;
    printReport({ type, rows, from, to });
  }

  function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        Object.assign(
          result,
          flatten(value as Record<string, unknown>, `${prefix}${key}.`)
        );
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
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={generate} disabled={loading} className="flex-1">
              {loading ? "Generando..." : "Generar"}
            </Button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              {reportTitle(type)} ({rows.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!rows.length}
              >
                Imprimir
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!rows.length}
              >
                Exportar completo
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Vista resumida para pantalla e impresión. La exportación incluye
            todos los campos.
          </p>
        </CardHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Genera un reporte para ver los resultados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-3 py-2 font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 text-slate-800">
                        {formatReportCell(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
