"use client";

import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";
import { exportToCSV } from "@/lib/export/csv";

export function ExportButtons({
  data,
  filename,
}: {
  data: Record<string, unknown>[];
  filename: string;
}) {
  function handleExport() {
    exportToCSV(data, filename);
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="h-4 w-4" />
      Exportar Excel
    </Button>
  );
}
