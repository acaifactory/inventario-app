import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function LocationsSettingsPage() {
  const locations = await prisma.location.findMany({
    include: { store: true },
    orderBy: [{ store: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Localidades"
        description="Cocina, freezer, almacén, mostrador — por tienda"
      />
      <Card>
        <div className="divide-y divide-slate-100">
          {locations.map((loc) => (
            <div key={loc.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium text-slate-900">{loc.name}</p>
              <p className="text-sm text-slate-500">
                {loc.store?.name ?? "Sin tienda"} · {loc.description ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
