import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsClient } from "@/components/reports/ReportsClient";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Inventario, movimientos, desperdicio y consumo filtrables"
      />
      <ReportsClient />
    </div>
  );
}
