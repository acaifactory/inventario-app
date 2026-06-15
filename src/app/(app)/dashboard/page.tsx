import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatQtyWithUnit,
  formatRegisteredQuantity,
  loanPendingInRegisteredUnit,
} from "@/lib/utils";
import {
  DollarSign,
  AlertTriangle,
  TrendingDown,
  Clock,
  TrendingUp,
  ShoppingCart,
  Receipt,
  HandCoins,
  Bell,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { getDashboardData } from "@/lib/inventory/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const fullCostPct =
    data.latestPeriod?.actualFullCostPercent ??
    data.financialPreview?.actualFullCostPercent ??
    null;
  const foodCostPct =
    data.totalValue > 0
      ? (data.foodCostValue / data.totalValue) * 100
      : null;
  const opportunity =
    data.latestPeriod?.opportunityDollars ??
    data.financialPreview?.opportunityDollars ??
    0;

  const stats = [
    {
      label: "Valor total inventario",
      value: formatCurrency(data.totalValue),
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
      href: "/valuation",
    },
    {
      label: "Bajo mínimo",
      value: String(data.lowStockCount),
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
      href: "/products",
    },
    {
      label: "Full Cost",
      value: fullCostPct != null ? `${fullCostPct.toFixed(1)}%` : "—",
      icon: PieChart,
      color: "text-violet-600 bg-violet-50",
      href: "/food-cost",
    },
    {
      label: "Food Cost",
      value: foodCostPct != null ? `${foodCostPct.toFixed(1)}%` : "—",
      icon: TrendingUp,
      color: "text-sky-600 bg-sky-50",
      href: "/food-cost",
    },
    {
      label: "Oportunidad",
      value: formatCurrency(opportunity),
      icon: TrendingDown,
      color: "text-amber-600 bg-amber-50",
      href: "/food-cost",
    },
    {
      label: "Préstamos pendientes",
      value: String(data.pendingLoansCount),
      icon: HandCoins,
      color: "text-orange-600 bg-orange-50",
      href: "/loans",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Resumen ejecutivo"
        description="Entiende el negocio en menos de 30 segundos"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/purchases">
              <Button>
                <ShoppingCart className="h-4 w-4" />
                Registrar compra
              </Button>
            </Link>
            <Link href="/movements?tab=exit">
              <Button variant="outline">Registrar salida</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {data.alerts.length > 0 ? (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Bell className="h-4 w-4" />
              Alertas ({data.alertCount})
            </CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {data.alerts.map((a, i) => (
              <Link key={i} href={a.href}>
                <Badge variant="warning">{a.message}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-violet-500" />
              Compras recientes
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.recentPurchases.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {inv.supplier.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {inv.invoiceNumber ?? "Sin #"} · {formatDate(inv.date)}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(inv.totalAmount)}
                </p>
              </div>
            ))}
            {data.recentPurchases.length === 0 && (
              <p className="text-sm text-slate-500">Sin compras registradas</p>
            )}
            <Link
              href="/purchases"
              className="block pt-2 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Ver todas las facturas →
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-amber-500" />
              Compras sugeridas
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.usage.topSuggestions.map((s) => (
              <div
                key={s.productId}
                className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    Comprar {formatQtyWithUnit(s.suggestedQty, s.unit, 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(s.estimatedCost)}
                  </p>
                  <Badge
                    variant={
                      s.urgency === "urgent"
                        ? "danger"
                        : s.urgency === "soon"
                          ? "warning"
                          : "info"
                    }
                  >
                    {s.urgency === "urgent"
                      ? "Urgente"
                      : s.urgency === "soon"
                        ? "Pronto"
                        : "Planificar"}
                  </Badge>
                </div>
              </div>
            ))}
            {data.usage.topSuggestions.length === 0 && (
              <p className="text-sm text-slate-500">
                Sin sugerencias. Registra salidas para generar historial.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Productos bajo mínimo
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {(data.lowStock ?? []).map((item) => (
              <div
                key={`${item.id}-${item.location}`}
                className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">{item.location}</p>
                </div>
                <Badge variant="warning">
                  {formatNumber(item.quantity)} / {formatNumber(item.minQuantity)}
                </Badge>
              </div>
            ))}
            {data.lowStock.length === 0 && (
              <p className="text-sm text-slate-500">Inventario saludable</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-orange-500" />
              Préstamos pendientes
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.pendingLoans.map((l) => {
              const pending = loanPendingInRegisteredUnit(l);
              const unit = l.registeredUnit ?? l.product.unit;
              return (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-orange-50/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-slate-500">
                    {l.direction} · {formatDate(l.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatQtyWithUnit(pending, unit)}
                  </p>
                  <Badge variant="warning">{l.status}</Badge>
                </div>
              </div>
            );
            })}
            {data.pendingLoans.length === 0 && (
              <p className="text-sm text-slate-500">Sin préstamos abiertos</p>
            )}
            <Link
              href="/loans"
              className="block pt-2 text-sm font-medium text-violet-600"
            >
              Gestionar préstamos →
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valor por categoría</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {(data.byCategory ?? []).map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-700">
                  {cat.category}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(cat.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos recientes</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {(data.recentMovements ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {m.product.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.type} · {m.location.name} · {m.user.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatRegisteredQuantity({
                      quantity: m.quantity,
                      registeredQuantity: m.registeredQuantity,
                      registeredUnit: m.registeredUnit,
                      fallbackUnit: m.product.unit,
                    })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(m.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Por vencer
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {(data.expiringProducts ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-red-50/50 px-3 py-2"
              >
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-red-600">
                  {p.expirationDate ? formatDate(p.expirationDate) : "—"}
                </p>
              </div>
            ))}
            {data.expiringProducts.length === 0 && (
              <p className="text-sm text-slate-500">Nada por vencer pronto</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Fast movers
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.mostUsed.map((p) => (
              <div
                key={p.productId}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatQtyWithUnit(p.quantityUsed, p.unit)} usado
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(p.valueUsed)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatQtyWithUnit(p.weeklyAvgQty, p.unit)}/sem
                  </p>
                </div>
              </div>
            ))}
            {data.mostUsed.length === 0 && (
              <p className="text-sm text-slate-500">Sin datos de consumo aún</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
