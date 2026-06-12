import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdjustmentForm } from "@/components/forms/AdjustmentForm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default async function AdjustmentsPage() {
  const adjustments = await prisma.inventoryAdjustment.findMany({
    orderBy: { date: "desc" },
    take: 50,
    include: {
      product: true,
      location: true,
      user: { select: { name: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Ajustes de inventario"
        description="Corregir diferencias entre inventario físico y sistema"
      />

      <div className="mb-8">
        <AdjustmentForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de ajustes ({adjustments.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Producto</th>
                <th className="py-2 pr-3">Localidad</th>
                <th className="py-2 pr-3">Motivo</th>
                <th className="py-2 pr-3">Registrado por</th>
                <th className="py-2 pr-3 text-right">Esperado</th>
                <th className="py-2 pr-3 text-right">Contado</th>
                <th className="py-2 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-700">
                    {formatDateTime(a.date)}
                  </td>
                  <td className="py-2 pr-3 font-medium text-slate-900">
                    {a.product.name}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{a.location.name}</td>
                  <td className="py-2 pr-3 text-slate-600">{a.reason}</td>
                  <td className="py-2 pr-3 text-slate-600">
                    {a.registeredByName || a.user.name}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatNumber(a.expectedQuantity)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatNumber(a.countedQuantity)}
                  </td>
                  <td className="py-2 text-right">
                    <Badge
                      variant={
                        a.difference < 0
                          ? "danger"
                          : a.difference > 0
                            ? "success"
                            : "default"
                      }
                    >
                      {a.difference > 0 ? "+" : ""}
                      {formatNumber(a.difference)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {adjustments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    Sin ajustes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
