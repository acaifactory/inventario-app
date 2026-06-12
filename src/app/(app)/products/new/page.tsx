"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { FINANCIAL_CLASSIFICATIONS, UNITS } from "@/lib/constants";

interface Option {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Option[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    subcategory: "",
    financialClassification: "FOOD_COST",
    includeInFoodCost: "true",
    unit: "UNIT",
    sku: "",
    minQuantity: "0",
    supplierId: "",
    averageCost: "0",
    storeId: "",
    initialQuantity: "0",
    expirationDate: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/stores").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
    ]).then(([c, s, sup]) => {
      setCategories(c);
      setStores(s);
      setSuppliers(sup);
    });
  }, []);

  function onFinancialChange(value: string) {
    const meta = FINANCIAL_CLASSIFICATIONS.find((f) => f.value === value);
    setForm((prev) => ({
      ...prev,
      financialClassification: value,
      includeInFoodCost: meta?.includeInFoodCost ? "true" : "false",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        minQuantity: Number(form.minQuantity),
        averageCost: Number(form.averageCost),
        initialQuantity: Number(form.initialQuantity),
        includeInFoodCost: form.includeInFoodCost === "true",
        expirationDate: form.expirationDate || undefined,
      }),
    });

    if (res.ok) {
      const product = await res.json();
      router.push(`/products/${product.id}`);
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nuevo producto"
        description="Se crean conversiones estándar (Libras, Manga, Each, Box…) según la unidad base"
      />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value })
              }
              required
            >
              <option value="">Seleccionar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Subcategoría</Label>
            <Input
              value={form.subcategory}
              onChange={(e) =>
                setForm({ ...form, subcategory: e.target.value })
              }
              placeholder="Ej. Frutas frescas"
            />
          </div>
          <div>
            <Label>Clasificación financiera</Label>
            <Select
              value={form.financialClassification}
              onChange={(e) => onFinancialChange(e.target.value)}
              required
            >
              {FINANCIAL_CLASSIFICATIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Incluir en Food Cost / COGS</Label>
            <Select
              value={form.includeInFoodCost}
              onChange={(e) =>
                setForm({ ...form, includeInFoodCost: e.target.value })
              }
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </Select>
          </div>
          <div>
            <Label>Unidad base</Label>
            <Select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>SKU</Label>
            <Input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <Label>Cantidad mínima</Label>
            <Input
              type="number"
              value={form.minQuantity}
              onChange={(e) =>
                setForm({ ...form, minQuantity: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Costo inicial</Label>
            <Input
              type="number"
              step="0.01"
              value={form.averageCost}
              onChange={(e) =>
                setForm({ ...form, averageCost: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Proveedor</Label>
            <Select
              value={form.supplierId}
              onChange={(e) =>
                setForm({ ...form, supplierId: e.target.value })
              }
            >
              <option value="">Opcional</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <StoreSearch
            label="Tienda (stock inicial)"
            value={form.storeId}
            onChange={(id) => setForm({ ...form, storeId: id })}
            stores={stores}
          />
          <div>
            <Label>Cantidad inicial (unidad base)</Label>
            <Input
              type="number"
              value={form.initialQuantity}
              onChange={(e) =>
                setForm({ ...form, initialQuantity: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Fecha de expiración</Label>
            <Input
              type="date"
              value={form.expirationDate}
              onChange={(e) =>
                setForm({ ...form, expirationDate: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Guardando..." : "Crear producto"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
