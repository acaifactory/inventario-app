import { exportToCSV } from "@/lib/export/csv";
import {
  escapeHtml,
  printPortraitDocument,
  PRINT_STYLES,
} from "@/lib/export/document-print";
import { formatCurrency, formatDate, formatRegisteredQuantity } from "@/lib/utils";
import { EXIT_REASONS } from "@/lib/constants";
import { storeLocationLabel } from "@/lib/stores/default-location";

type ProductRef = { name: string; unit: string };
type LocationRef = { name: string; store?: { name: string } | null };

export type MovementRecord = {
  id: string;
  type: string;
  date: Date | string;
  quantity: number;
  registeredQuantity: number | null;
  registeredUnit: string | null;
  unitCost: number | null;
  totalCost: number | null;
  exitReason?: string | null;
  registeredByName: string;
  notes?: string | null;
  invoiceNumber?: string | null;
  supplier?: { name: string } | null;
  product: ProductRef;
  location: LocationRef;
};

export type TransferRecord = {
  id: string;
  date: Date | string;
  quantity: number;
  registeredQuantity: number | null;
  registeredUnit: string | null;
  registeredByName: string;
  deliveredByName?: string | null;
  receivedByName?: string | null;
  notes?: string | null;
  product: ProductRef;
  fromLocation: LocationRef;
  toLocation: LocationRef;
};

export type LoanRecord = {
  id: string;
  direction: "OUT" | "IN";
  date: Date | string;
  quantity: number;
  registeredQuantity: number | null;
  registeredUnit: string | null;
  totalCost: number;
  counterpartyName: string;
  responsibleName: string;
  registeredByName: string;
  notes?: string | null;
  product: ProductRef;
  location: LocationRef;
};

function exitReasonLabel(value?: string | null) {
  return EXIT_REASONS.find((r) => r.value === value)?.label ?? value ?? "—";
}

function quantityLabel(record: {
  quantity: number;
  registeredQuantity: number | null;
  registeredUnit: string | null;
  product: ProductRef;
}) {
  return formatRegisteredQuantity({
    quantity: record.quantity,
    registeredQuantity: record.registeredQuantity,
    registeredUnit: record.registeredUnit,
    fallbackUnit: record.product.unit,
  });
}

function buildKeyValuePrint(
  title: string,
  rows: { label: string; value: string }[]
) {
  const body = rows
    .map(
      (row) =>
        `<tr><th style="width:38%">${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table>${body}</table>
</body>
</html>`;
}

export function printMovementRecord(
  record: MovementRecord,
  kind: "entry" | "exit"
) {
  const title = kind === "entry" ? "Entrada de inventario" : "Salida de inventario";
  const rows = [
    { label: "Fecha", value: formatDate(record.date) },
    { label: "Producto", value: record.product.name },
    { label: "Cantidad", value: quantityLabel(record) },
    { label: "Ubicación", value: storeLocationLabel(record.location) },
    { label: "Registrado por", value: record.registeredByName },
  ];

  if (kind === "exit") {
    rows.push({ label: "Motivo", value: exitReasonLabel(record.exitReason) });
  } else {
    if (record.unitCost != null) {
      rows.push({
        label: "Costo unitario",
        value: formatCurrency(record.unitCost),
      });
    }
    if (record.totalCost != null) {
      rows.push({
        label: "Costo total",
        value: formatCurrency(record.totalCost),
      });
    }
    if (record.supplier?.name) {
      rows.push({ label: "Proveedor", value: record.supplier.name });
    }
    if (record.invoiceNumber) {
      rows.push({ label: "Nº factura", value: record.invoiceNumber });
    }
  }

  if (record.notes) {
    rows.push({ label: "Notas", value: record.notes });
  }

  printPortraitDocument(buildKeyValuePrint(title, rows), title);
}

export function exportMovementRecord(
  record: MovementRecord,
  kind: "entry" | "exit"
) {
  const prefix = kind === "entry" ? "entrada" : "salida";
  exportToCSV(
    [
      {
        Fecha: formatDate(record.date),
        Producto: record.product.name,
        Cantidad: quantityLabel(record),
        Ubicación: storeLocationLabel(record.location),
        ...(kind === "exit"
          ? { Motivo: exitReasonLabel(record.exitReason) }
          : {
              "Costo total": record.totalCost ?? 0,
              Proveedor: record.supplier?.name ?? "",
              "Nº factura": record.invoiceNumber ?? "",
            }),
        "Registrado por": record.registeredByName,
        Notas: record.notes ?? "",
      },
    ],
    `${prefix}-${record.product.name.replace(/[^\w.-]+/g, "_")}`
  );
}

export function printTransferRecord(record: TransferRecord) {
  const rows = [
    { label: "Fecha", value: formatDate(record.date) },
    { label: "Producto", value: record.product.name },
    { label: "Cantidad", value: quantityLabel(record) },
    { label: "Origen", value: storeLocationLabel(record.fromLocation) },
    { label: "Destino", value: storeLocationLabel(record.toLocation) },
    { label: "Registrado por", value: record.registeredByName },
  ];
  if (record.deliveredByName) {
    rows.push({ label: "Entrega", value: record.deliveredByName });
  }
  if (record.receivedByName) {
    rows.push({ label: "Recibe", value: record.receivedByName });
  }
  if (record.notes) {
    rows.push({ label: "Notas", value: record.notes });
  }
  printPortraitDocument(buildKeyValuePrint("Transferencia", rows), "Transferencia");
}

export function exportTransferRecord(record: TransferRecord) {
  exportToCSV(
    [
      {
        Fecha: formatDate(record.date),
        Producto: record.product.name,
        Cantidad: quantityLabel(record),
        Origen: storeLocationLabel(record.fromLocation),
        Destino: storeLocationLabel(record.toLocation),
        "Registrado por": record.registeredByName,
        Notas: record.notes ?? "",
      },
    ],
    `transferencia-${record.product.name.replace(/[^\w.-]+/g, "_")}`
  );
}

export function printLoanRecord(record: LoanRecord) {
  const title = record.direction === "OUT" ? "Préstamo OUT" : "Préstamo IN";
  const rows = [
    { label: "Fecha", value: formatDate(record.date) },
    { label: "Producto", value: record.product.name },
    { label: "Cantidad", value: quantityLabel(record) },
    { label: "Ubicación", value: storeLocationLabel(record.location) },
    {
      label: record.direction === "OUT" ? "Destinatario" : "Prestó",
      value: record.counterpartyName,
    },
    { label: "Responsable", value: record.responsibleName },
    { label: "Valor", value: formatCurrency(record.totalCost) },
    { label: "Registrado por", value: record.registeredByName },
  ];
  if (record.notes) {
    rows.push({ label: "Notas", value: record.notes });
  }
  printPortraitDocument(buildKeyValuePrint(title, rows), title);
}

export function exportLoanRecord(record: LoanRecord) {
  exportToCSV(
    [
      {
        Fecha: formatDate(record.date),
        Tipo: record.direction === "OUT" ? "Préstamo OUT" : "Préstamo IN",
        Producto: record.product.name,
        Cantidad: quantityLabel(record),
        Ubicación: storeLocationLabel(record.location),
        Contraparte: record.counterpartyName,
        Responsable: record.responsibleName,
        Valor: record.totalCost,
        "Registrado por": record.registeredByName,
        Notas: record.notes ?? "",
      },
    ],
    `prestamo-${record.product.name.replace(/[^\w.-]+/g, "_")}`
  );
}
