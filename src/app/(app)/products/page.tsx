import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { UNITS, financialClassificationLabel } from "@/lib/constants";
import { Plus, Settings2 } from "lucide-react";

function unitLabel(unit: string) {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      category: true,
      supplier: true,
      units: true,
      stocks: { include: { location: true } },
    },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader
        title="Catálogo de productos"
        description={`${products.length} productos — Food Cost, Packaging, Limpieza y Operativos`}
        action={
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </Link>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Clasificación</th>
                <th className="px-4 py-3 font-medium">Stock total</th>
                <th className="px-4 py-3 font-medium">Mínimo</th>
                <th className="px-4 py-3 font-medium">Costo prom.</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Unidades</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const totalStock = product.stocks.reduce(
                  (sum, s) => sum + s.quantity,
                  0
                );
                const isLow = totalStock <= product.minQuantity;
                const value = totalStock * product.averageCost;

                const alternateCount = product.units.filter(
                  (u) => u.unit !== product.unit
                ).length;

                return (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {product.name}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-slate-400">
                          SKU: {product.sku}
                        </p>
                      )}
                      {product.subcategory ? (
                        <p className="text-xs text-slate-400">
                          {product.subcategory}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{product.category.name}</td>
                    <td className="px-4 py-3 text-xs">
                      {financialClassificationLabel(
                        product.financialClassification
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(totalStock)} {unitLabel(product.unit)}
                    </td>
                    <td className="px-4 py-3">
                      {formatNumber(product.minQuantity)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(product.averageCost)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(value)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/products/${product.id}`}>
                        <Button variant="secondary" size="sm">
                          <Settings2 className="h-3.5 w-3.5" />
                          {alternateCount > 0
                            ? `${alternateCount + 1} UOM`
                            : "Configurar"}
                        </Button>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <Badge variant="warning">Bajo</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">
            No hay productos. Ejecuta el seed o crea uno nuevo.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.slice(0, 6).map((product) => (
          <Card key={product.id}>
            <p className="font-semibold text-slate-900">{product.name}</p>
            <p className="text-xs text-slate-500">{product.category.name}</p>
            <div className="mt-3 space-y-1">
              {product.stocks.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between text-sm text-slate-600"
                >
                  <span>{s.location.name}</span>
                  <span>{formatNumber(s.quantity)}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
