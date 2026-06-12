import { getSession, canManageCatalog } from "@/lib/auth";
import { SuppliersClient } from "@/components/purchases/SuppliersClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";

export default async function SuppliersPage() {
  const session = await getSession();
  const canManage = session && canManageCatalog(session.role);

  if (canManage) {
    return <SuppliersClient />;
  }

  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Proveedores / Distribuidores"
        description="Catálogo para compras y facturas"
      />
      <Card>
        <div className="divide-y divide-slate-100">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-slate-900">{s.name}</p>
                {s.contact || s.phone ? (
                  <p className="text-sm text-slate-500">
                    {[s.contact, s.phone].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              <Badge variant="info">{s._count.products} productos</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
