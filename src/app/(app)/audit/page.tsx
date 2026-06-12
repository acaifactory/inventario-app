import { prisma } from "@/lib/prisma";
import { getAuditLogEventDate } from "@/lib/inventory/audit";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  const rows = logs
    .map((log) => ({
      ...log,
      eventDate: getAuditLogEventDate(log),
    }))
    .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  return (
    <div>
      <PageHeader
        title="Historial"
        description="Auditoría de movimientos con fecha operativa y stock antes/después"
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Acción</th>
                <th className="py-2 pr-3">Registrado por</th>
                <th className="py-2 pr-3 text-right">Cantidad</th>
                <th className="py-2 pr-3 text-right">Stock antes</th>
                <th className="py-2 pr-3 text-right">Stock después</th>
                <th className="py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-700">
                    {formatDateTime(log.eventDate)}
                  </td>
                  <td className="py-2 pr-3 font-medium text-slate-900">
                    {log.action}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {log.registeredByName}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {log.quantity != null ? formatNumber(log.quantity) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {log.stockBefore != null
                      ? formatNumber(log.stockBefore)
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {log.stockAfter != null
                      ? formatNumber(log.stockAfter)
                      : "—"}
                  </td>
                  <td className="py-2 max-w-xs truncate text-slate-600">
                    {log.notes ?? "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Sin registros en el historial
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
