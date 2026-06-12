import * as XLSX from "xlsx";

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function dataToCSVString<T extends Record<string, unknown>>(
  data: T[]
): string {
  const ws = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(ws);
}
