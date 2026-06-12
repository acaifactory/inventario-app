"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { PHYSICAL_COUNT_COLUMNS, UNITS } from "@/lib/constants";
import { getUnitLabel } from "@/lib/utils";

type ProductUnitRow = {
  unit: string;
  conversionFactor: number;
  label?: string | null;
};

type Props = {
  productId: string;
  productName: string;
  baseUnit: string;
  units: ProductUnitRow[];
};

export function ProductUnitsEditor({
  productId,
  productName,
  baseUnit,
  units: initialUnits,
}: Props) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [form, setForm] = useState({
    unit: "LB",
    conversionFactor: "",
    label: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const alternates = units.filter((u) => u.unit !== baseUnit);

  async function addUnit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/products/${productId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unit: form.unit,
        conversionFactor: Number(form.conversionFactor),
        label: form.label || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error");
      setLoading(false);
      return;
    }

    const row = await res.json();
    setUnits((prev) => {
      const rest = prev.filter((u) => u.unit !== row.unit);
      return [...rest, row].sort((a, b) => a.unit.localeCompare(b.unit));
    });
    setForm({ unit: "LB", conversionFactor: "", label: "" });
    setLoading(false);
    router.refresh();
  }

  async function removeUnit(unit: string) {
    if (unit === baseUnit) return;
    setLoading(true);
    await fetch(`/api/products/${productId}/units?unit=${unit}`, {
      method: "DELETE",
    });
    setUnits((prev) => prev.filter((u) => u.unit !== unit));
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-1 font-semibold">{productName}</h3>
        <p className="mb-4 text-sm text-slate-500">
          Unidad base: <strong>{getUnitLabel(baseUnit)}</strong>. Cada unidad
          alternativa indica cuántas unidades base equivale 1 unidad (ej. 1 Box
          = 5 bolsas → factor 5).
        </p>

        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500">
                <th className="py-2 pr-3">Unidad</th>
                <th className="py-2 pr-3">Etiqueta</th>
                <th className="py-2 pr-3">Factor → base</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-3 font-medium">
                  {getUnitLabel(baseUnit)}
                </td>
                <td className="py-2 pr-3 text-slate-500">Base</td>
                <td className="py-2 pr-3">1</td>
                <td className="py-2" />
              </tr>
              {alternates.map((u) => (
                <tr key={u.unit} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{getUnitLabel(u.unit)}</td>
                  <td className="py-2 pr-3">{u.label ?? "—"}</td>
                  <td className="py-2 pr-3">{u.conversionFactor}</td>
                  <td className="py-2 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={loading}
                      onClick={() => removeUnit(u.unit)}
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Hoja de conteo físico usa:{" "}
          {PHYSICAL_COUNT_COLUMNS.map((c) => c.label).join(", ")}
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Agregar conversión</h3>
        <form
          onSubmit={addUnit}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <Label>Unidad</Label>
            <Select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {UNITS.filter((u) => u.value !== baseUnit).map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Factor (1 unidad = X base)</Label>
            <Input
              type="number"
              min="0.0001"
              step="0.0001"
              value={form.conversionFactor}
              onChange={(e) =>
                setForm({ ...form, conversionFactor: e.target.value })
              }
              required
              placeholder="ej. 5"
            />
          </div>
          <div>
            <Label>Etiqueta (opcional)</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="ej. Manga"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading}>
              Agregar
            </Button>
          </div>
        </form>
        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : null}
      </Card>
    </div>
  );
}
