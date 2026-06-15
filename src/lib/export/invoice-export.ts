import { exportToCSV } from "@/lib/export/csv";
import { formatCurrency, formatDate } from "@/lib/utils";

export type InvoiceExportLine = {
  product: { name: string };
  totalPrice: number;
};

export type InvoiceExportData = {
  invoiceNumber: string;
  date: Date | string;
  supplier: { name: string };
  lines: InvoiceExportLine[];
  totalAmount: number;
};

export function buildInvoiceExportRows(invoice: InvoiceExportData) {
  return invoice.lines.map((line) => ({
    Fecha: formatDate(invoice.date),
    "Nº factura": invoice.invoiceNumber,
    Distribuidor: invoice.supplier.name,
    Producto: line.product.name,
    "Precio total": line.totalPrice,
  }));
}

export function exportInvoiceSpreadsheet(
  invoice: InvoiceExportData,
  filename?: string
) {
  const rows = buildInvoiceExportRows(invoice);
  const safeName =
    filename ??
    `factura-${invoice.invoiceNumber.replace(/[^\w.-]+/g, "_")}`;
  exportToCSV(rows, safeName);
}

export function printInvoicePortrait(invoice: InvoiceExportData) {
  const rows = invoice.lines
    .map(
      (line) =>
        `<tr>
          <td>${escapeHtml(line.product.name)}</td>
          <td style="text-align:right">${escapeHtml(formatCurrency(line.totalPrice))}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Factura ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @page { size: portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      font-size: 13px;
    }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { margin-bottom: 20px; color: #475569; }
    .meta p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
    tfoot td { border-top: 2px solid #cbd5e1; font-weight: 700; }
    .total-label { text-align: right; }
  </style>
</head>
<body>
  <h1>Factura de compra</h1>
  <div class="meta">
    <p><strong>Nº factura:</strong> ${escapeHtml(invoice.invoiceNumber)}</p>
    <p><strong>Fecha:</strong> ${escapeHtml(formatDate(invoice.date))}</p>
    <p><strong>Distribuidor:</strong> ${escapeHtml(invoice.supplier.name)}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th style="text-align:right">Precio total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td class="total-label">Total factura</td>
        <td style="text-align:right">${escapeHtml(formatCurrency(invoice.totalAmount))}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  const triggerPrint = () => {
    win.print();
    win.onafterprint = () => win.close();
  };
  if (win.document.readyState === "complete") {
    triggerPrint();
  } else {
    win.onload = triggerPrint;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
