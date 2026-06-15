"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatCurrency, fullCostIndicator } from "@/lib/utils";

type Metrics = {
  openingInventoryValue: number;
  purchasesValue: number;
  loansInValue: number;
  closingInventoryValue: number;
  loansOutValue: number;
  costOfSales: number;
  actualFullCostPercent: number;
  variancePercent: number;
  opportunityDollars: number;
};

export default function FoodCostPage() {
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    totalSales: "",
    targetFullCostPercent: "30",
    responsibleName: "",
  });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [periods, setPeriods] = useState<
    (Metrics & {
      id: string;
      startDate: string;
      endDate: string;
      totalSales: number;
      targetFullCostPercent: number;
    })[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setForm((f) => ({
      ...f,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }));
    fetch("/api/financial-periods")
      .then((r) => r.json())
      .then(setPeriods);
  }, []);

  async function preview() {
    setLoading(true);
    const res = await fetch("/api/financial-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, preview: true }),
    });
    const data = await res.json();
    setMetrics(data);
    setLoading(false);
  }

  async function savePeriod() {
    setLoading(true);
    const res = await fetch("/api/financial-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const list = await fetch("/api/financial-periods", {
        cache: "no-store",
      }).then((r) => r.json());
      setPeriods(list);
    }
    setLoading(false);
  }

  const indicator =
    metrics && form.targetFullCostPercent
      ? fullCostIndicator(
          metrics.actualFullCostPercent,
          Number(form.targetFullCostPercent)
        )
      : null;

  const indicatorEmoji =
    indicator === "green" ? "🟢" : indicator === "yellow" ? "🟡" : "🔴";

  return (
    <div>
      <PageHeader
        title="Food Cost y Full Cost"
        description="Cost of Sales = inventario inicial + compras − inventario final. Las salidas de inventario reducen el cierre y suben el costo."
      />

      <Card className="mb-6 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Fecha inicial</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Fecha final</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Ventas totales del período</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.totalSales}
              onChange={(e) =>
                setForm({ ...form, totalSales: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Full Cost objetivo %</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={form.targetFullCostPercent}
              onChange={(e) =>
                setForm({ ...form, targetFullCostPercent: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Responsable *</Label>
            <Input
              value={form.responsibleName}
              onChange={(e) =>
                setForm({ ...form, responsibleName: e.target.value })
              }
              required
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={preview} disabled={loading}>
            Calcular
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={savePeriod}
            disabled={loading || !metrics}
          >
            Guardar período analizado
          </Button>
        </div>
      </Card>

      {metrics ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">Inventario inicial</p>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.openingInventoryValue)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Compras</p>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.purchasesValue)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Préstamos IN</p>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.loansInValue)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Inventario final</p>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.closingInventoryValue)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Préstamos OUT pendientes</p>
            <p className="text-xl font-bold">
              {formatCurrency(metrics.loansOutValue)}
            </p>
          </Card>
          <Card className="border-violet-200 bg-violet-50/40">
            <p className="text-sm text-slate-500">Cost of Sales</p>
            <p className="text-xl font-bold text-violet-700">
              {formatCurrency(metrics.costOfSales)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">
              Full Cost real {indicatorEmoji}
            </p>
            <p className="text-2xl font-bold">
              {metrics.actualFullCostPercent.toFixed(2)}%
            </p>
            <p className="text-xs text-slate-500">
              Objetivo {form.targetFullCostPercent}% · Dif.{" "}
              {metrics.variancePercent.toFixed(2)}%
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Oportunidad ($)</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.opportunityDollars)}
            </p>
          </Card>
        </div>
      ) : null}

      <Card>
        <h3 className="mb-3 font-semibold">Períodos analizados</h3>
        <div className="space-y-2 text-sm">
          {periods.map((p) => (
            <div
              key={p.id}
              className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"
            >
              <span>
                {new Date(p.startDate).toLocaleDateString()} –{" "}
                {new Date(p.endDate).toLocaleDateString()}
              </span>
              <span>
                FC {(p.actualFullCostPercent ?? 0).toFixed(1)}% · COS{" "}
                {formatCurrency(p.costOfSales ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
