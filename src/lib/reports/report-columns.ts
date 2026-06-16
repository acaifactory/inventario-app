import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export type ReportColumn = {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
};

function money(value: unknown) {
  return formatCurrency(Number(value ?? 0));
}

function num(value: unknown) {
  return formatNumber(Number(value ?? 0));
}

function dateVal(value: unknown) {
  if (!value) return "—";
  return formatDate(String(value));
}

export const REPORT_DISPLAY_COLUMNS: Record<string, ReportColumn[]> = {
  current: [
    { key: "product.name", label: "Producto" },
    { key: "location.name", label: "Ubicación" },
    { key: "quantity", label: "Cantidad", format: num },
    { key: "product.unit", label: "Unidad" },
  ],
  valued: [
    { key: "productName", label: "Producto" },
    { key: "location", label: "Ubicación" },
    { key: "quantity", label: "Cantidad", format: num },
    { key: "value", label: "Valor", format: money },
  ],
  "low-stock": [
    { key: "product.name", label: "Producto" },
    { key: "location.name", label: "Ubicación" },
    { key: "quantity", label: "Stock", format: num },
    { key: "product.minQuantity", label: "Mínimo", format: num },
  ],
  expiring: [
    { key: "name", label: "Producto" },
    { key: "category.name", label: "Categoría" },
    { key: "expirationDate", label: "Vence", format: dateVal },
  ],
  entries: [
    { key: "date", label: "Fecha", format: dateVal },
    { key: "product.name", label: "Producto" },
    { key: "quantity", label: "Cantidad", format: num },
    { key: "location.name", label: "Ubicación" },
    { key: "totalCost", label: "Costo", format: money },
  ],
  exits: [
    { key: "date", label: "Fecha", format: dateVal },
    { key: "product.name", label: "Producto" },
    { key: "quantity", label: "Cantidad", format: num },
    { key: "exitReason", label: "Motivo" },
    { key: "totalCost", label: "Costo", format: money },
  ],
  waste: [
    { key: "date", label: "Fecha", format: dateVal },
    { key: "product.name", label: "Producto" },
    { key: "quantity", label: "Cantidad", format: num },
    { key: "totalCost", label: "Costo", format: money },
  ],
  transfers: [
    { key: "date", label: "Fecha", format: dateVal },
    { key: "product.name", label: "Producto" },
    { key: "fromLocation.name", label: "Desde" },
    { key: "toLocation.name", label: "Hacia" },
    { key: "quantity", label: "Cantidad", format: num },
  ],
  adjustments: [
    { key: "date", label: "Fecha", format: dateVal },
    { key: "product.name", label: "Producto" },
    { key: "difference", label: "Diferencia", format: num },
    { key: "reason", label: "Motivo" },
  ],
  purchases: [
    { key: "fecha", label: "Fecha", format: dateVal },
    { key: "factura", label: "Factura" },
    { key: "distribuidor", label: "Distribuidor" },
    { key: "producto", label: "Producto" },
    { key: "precioTotal", label: "Total", format: money },
  ],
  loans: [
    { key: "fecha", label: "Fecha", format: dateVal },
    { key: "direccion", label: "Tipo" },
    { key: "producto", label: "Producto" },
    { key: "pendiente", label: "Pendiente", format: num },
    { key: "costoTotal", label: "Valor", format: money },
    { key: "contraparte", label: "Contraparte" },
  ],
  costs: [
    { key: "concepto", label: "Concepto" },
    { key: "valor", label: "Valor", format: money },
    { key: "ventas", label: "Ventas", format: money },
    { key: "fullCostPct", label: "FC %", format: (v) => (v != null ? `${Number(v).toFixed(1)}%` : "—") },
  ],
  consumption: [
    { key: "product.name", label: "Producto" },
    { key: "product.category.name", label: "Categoría" },
    { key: "totalConsumed", label: "Consumido", format: num },
  ],
  "count-differences": [
    { key: "name", label: "Conteo" },
    { key: "location.name", label: "Ubicación" },
    { key: "completedAt", label: "Fecha", format: dateVal },
  ],
};

export function getNestedValue(obj: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function formatReportCell(
  row: Record<string, unknown>,
  column: ReportColumn
) {
  const raw = getNestedValue(row, column.key);
  if (column.format) return column.format(raw, row);
  if (raw == null || raw === "") return "—";
  return String(raw);
}

export function normalizeReportRows(
  type: string,
  data: unknown
): Record<string, unknown>[] {
  if (!data) return [];
  if (type === "valued" && typeof data === "object" && data !== null) {
    const valued = data as { byProduct?: Record<string, unknown>[] };
    if (valued.byProduct) return valued.byProduct;
  }
  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)
        : { value: item }
    );
  }
  if (typeof data === "object") return [data as Record<string, unknown>];
  return [];
}

export function reportTitle(type: string) {
  const titles: Record<string, string> = {
    current: "Inventario actual",
    valued: "Inventario valorizado",
    "low-stock": "Productos bajo mínimo",
    expiring: "Productos por vencer",
    entries: "Entradas",
    exits: "Salidas",
    waste: "Desperdicio",
    transfers: "Transferencias",
    adjustments: "Ajustes",
    purchases: "Compras / facturas",
    loans: "Préstamos",
    costs: "Food Cost y costos",
    consumption: "Consumo por producto",
    "count-differences": "Diferencias de conteo",
  };
  return titles[type] ?? "Reporte";
}
