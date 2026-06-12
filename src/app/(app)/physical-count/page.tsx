import { PageHeader } from "@/components/layout/PageHeader";
import { PhysicalCountClient } from "@/components/physical-count/PhysicalCountClient";

export default function PhysicalCountPage() {
  return (
    <div>
      <PageHeader
        title="Toma de inventario físico"
        description="Costo promedio de facturas · cuenta en Libras, Manga, Each, Broken box o Box"
      />
      <PhysicalCountClient />
    </div>
  );
}
