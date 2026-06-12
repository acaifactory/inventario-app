import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { STORE_TYPES } from "@/lib/constants";

export default async function StoresSettingsPage() {
  const stores = await prisma.store.findMany({
    include: { locations: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Tiendas y franquicias"
        description="Multi-localidad — cada tienda con sus áreas de inventario"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {stores.map((store) => (
          <Card key={store.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{store.name}</p>
                <p className="text-sm text-slate-500">{store.code}</p>
                {store.city ? (
                  <p className="text-sm text-slate-500">{store.city}</p>
                ) : null}
              </div>
              <Badge variant="info">
                {STORE_TYPES.find((t) => t.value === store.type)?.label}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {store.locations.length} localidades:{" "}
              {store.locations.map((l) => l.name).join(", ")}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
