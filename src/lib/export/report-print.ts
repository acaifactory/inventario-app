import {
  PRINT_STYLES,
  escapeHtml,
  printPortraitDocument,
} from "@/lib/export/document-print";
import {
  REPORT_DISPLAY_COLUMNS,
  formatReportCell,
  reportTitle,
  type ReportColumn,
} from "@/lib/reports/report-columns";

export function buildReportPrintHtml(options: {
  type: string;
  rows: Record<string, unknown>[];
  from?: string;
  to?: string;
}) {
  const columns =
    REPORT_DISPLAY_COLUMNS[options.type] ?? [
      { key: "value", label: "Dato" },
    ];

  const title = reportTitle(options.type);
  const period =
    options.from || options.to
      ? `<p>Período: ${escapeHtml(options.from ?? "—")} — ${escapeHtml(options.to ?? "—")}</p>`
      : "";

  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = options.rows
    .map((row) => rowToCells(row, columns))
    .map((cells) => `<tr>${cells}</tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <p>Inventario Açaí Factory</p>
    ${period}
    <p>Registros: ${options.rows.length}</p>
    <p>Generado: ${escapeHtml(new Date().toLocaleString("es"))}</p>
  </div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || `<tr><td colspan="${columns.length}">Sin datos</td></tr>`}</tbody>
  </table>
</body>
</html>`;

  return html;
}

function rowToCells(row: Record<string, unknown>, columns: ReportColumn[]) {
  return columns
    .map((col) => `<td>${escapeHtml(formatReportCell(row, col))}</td>`)
    .join("");
}

export function printReport(options: {
  type: string;
  rows: Record<string, unknown>[];
  from?: string;
  to?: string;
}) {
  const html = buildReportPrintHtml(options);
  printPortraitDocument(html, reportTitle(options.type));
}
