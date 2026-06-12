import { getValuationSummary } from "@/lib/inventory/valuation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ExportButtons } from "@/components/reports/ExportButtons";

export default async function ValuationPage() {
  const data = await getValuationSummary();

  const exportData = data.byProduct.map((p) => ({
    Producto: p.productName,
    Categoría: p.category,
    Subcategoría: p.subcategory,
    Clasificación: p.financialLabel,
    Localidad: p.location,
    Tienda: p.store ?? "—",
    Cantidad: p.quantity,
    "Costo unitario": p.unitCost,
    Valor: p.value,
  }));

  return (
    <div>
      <PageHeader
        title="Valorización de inventario"
        description="Food Cost, Packaging y valor total por clasificación financiera"
        action={
          <ExportButtons data={exportData} filename="inventario-valorizado" />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-violet-200 bg-violet-50/50">
          <p className="text-sm text-slate-500">Food + Packaging (COGS)</p>
          <p className="text-2xl font-bold text-violet-700">
            {formatCurrency(data.cogsValue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Food {formatCurrency(data.foodCostValue)} · Packaging{" "}
            {formatCurrency(data.packagingCostValue)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Food Cost</p>
          <p className="text-2xl font-bold text-emerald-700">
            {formatCurrency(data.foodCostValue)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Packaging Cost</p>
          <p className="text-2xl font-bold text-sky-700">
            {formatCurrency(data.packagingCostValue)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Cleaning Supplies</p>
          <p className="text-2xl font-bold">
            {formatCurrency(data.cleaningValue)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Operating Supplies</p>
          <p className="text-2xl font-bold">
            {formatCurrency(data.operatingValue)}
          </p>
        </Card>
        <Card className="border-slate-300">
          <p className="text-sm text-slate-500">Valor total general</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(data.totalValue)}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por clasificación financiera</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.byFinancial.map((f) => (
              <div
                key={f.classification}
                className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <span>
                  {f.label}
                  {f.inCogs ? (
                    <span className="ml-2 text-xs text-violet-600">COGS</span>
                  ) : null}
                </span>
                <span className="font-semibold">{formatCurrency(f.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por tienda</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.byStore.map((s) => (
              <div
                key={s.store}
                className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <span>{s.store}</span>
                <span className="font-semibold">{formatCurrency(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por categoría</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.byCategory.map((c) => (
              <div
                key={c.category}
                className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <span>{c.category}</span>
                <span className="font-semibold">{formatCurrency(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por localidad</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.byLocation.map((l) => (
              <div
                key={l.location}
                className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <span>{l.location}</span>
                <span className="font-semibold">{formatCurrency(l.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detalle por producto</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2">Producto</th>
                <th className="py-2">Clasificación</th>
                <th className="py-2">Localidad</th>
                <th className="py-2">Cantidad</th>
                <th className="py-2">Costo</th>
                <th className="py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.byProduct.map((p) => (
                <tr
                  key={`${p.productId}-${p.location}`}
                  className="border-b border-slate-100"
                >
                  <td className="py-2">{p.productName}</td>
                  <td className="py-2 text-xs">{p.financialLabel}</td>
                  <td className="py-2">{p.location}</td>
                  <td className="py-2">{formatNumber(p.quantity)}</td>
                  <td className="py-2">{formatCurrency(p.unitCost)}</td>
                  <td className="py-2 font-medium">{formatCurrency(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
