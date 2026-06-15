"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { ProductSearch, type ProductOption } from "@/components/ui/ProductSearch";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { PurchaseLineUnitInput } from "@/components/forms/PurchaseLineUnitInput";
import {
  computeBaseQuantityFromLine,
  contentsPerUnitForSubmit,
  defaultPurchaseUnitForProduct,
  onDynamicUnitChange,
  validateDynamicLineConversion,
} from "@/lib/product-units-ui";
import { formatCurrency, formatNumber, getUnitLabel } from "@/lib/utils";

type ProductWithStock = ProductOption & {
  stocks: { locationId: string; quantity: number }[];
  averageCost?: number;
};

const today = () => new Date().toISOString().slice(0, 10);

export function AdjustmentForm() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productId: "",
    storeId: "",
    countedQuantity: "",
    unit: "UNIT",
    contentsPerUnit: "",
    reason: "",
    registeredByName: "",
    notes: "",
    date: today(),
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/stores").then((r) => r.json()),
    ]).then(([p, s]) => {
      setProducts(p);
      setStores(s);
    });
  }, []);

  const locationId =
    stores.find((s) => s.id === form.storeId)?.defaultLocationId ?? "";

  const expectedBase =
    products
      .find((p) => p.id === form.productId)
      ?.stocks.find((s) => s.locationId === locationId)?.quantity ?? 0;

  const countedBase = useMemo(() => {
    return (
      computeBaseQuantityFromLine(
        selectedProduct,
        Number(form.countedQuantity || 0),
        form.unit,
        form.contentsPerUnit
      ) ?? 0
    );
  }, [form.countedQuantity, form.unit, form.contentsPerUnit, selectedProduct]);

  const difference = countedBase - expectedBase;
  const unitCost = selectedProduct?.averageCost ?? 0;
  const valueDiff = difference * unitCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validation = validateDynamicLineConversion(
      selectedProduct,
      form.unit,
      form.contentsPerUnit
    );
    if (validation) {
      setError(validation);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.productId,
        storeId: form.storeId,
        countedQuantity: Number(form.countedQuantity),
        unit: form.unit,
        contentsPerUnit: contentsPerUnitForSubmit(
          selectedProduct,
          form.unit,
          form.contentsPerUnit
        ),
        reason: form.reason,
        registeredByName: form.registeredByName,
        notes: form.notes,
        date: form.date,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
    setSelectedProduct(undefined);
    setForm({
      productId: "",
      storeId: "",
      countedQuantity: "",
      unit: "UNIT",
      contentsPerUnit: "",
      reason: "",
      registeredByName: form.registeredByName,
      notes: "",
      date: today(),
    });
  }

  const baseLabel = selectedProduct
    ? getUnitLabel(selectedProduct.unit ?? "UNIT")
    : "base";

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ProductSearch
              value={form.productId}
              onChange={(id, product) => {
                setSelectedProduct(product as ProductWithStock);
                setForm({
                  ...form,
                  productId: id,
                  unit: defaultPurchaseUnitForProduct(product),
                  contentsPerUnit: "",
                });
              }}
              products={products}
              required
            />
          </div>

          <StoreSearch
            label="Tienda"
            value={form.storeId}
            onChange={(id) => setForm({ ...form, storeId: id })}
            stores={stores}
            required
          />

          <div>
            <Label>Fecha del ajuste</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Esperado (sistema)</Label>
            <Input value={formatNumber(expectedBase)} disabled />
            <p className="mt-1 text-xs text-slate-500">{baseLabel}</p>
          </div>

          <PurchaseLineUnitInput
            product={selectedProduct}
            quantity={form.countedQuantity}
            unit={form.unit}
            contentsPerUnit={form.contentsPerUnit}
            quantityLabel="Cantidad contada"
            onQuantityChange={(countedQuantity) =>
              setForm({ ...form, countedQuantity })
            }
            onUnitChange={(unit) =>
              setForm({
                ...form,
                unit,
                ...onDynamicUnitChange(selectedProduct, unit),
              })
            }
            onContentsPerUnitChange={(contentsPerUnit) =>
              setForm({ ...form, contentsPerUnit })
            }
            required
          />

          <div>
            <Label>Diferencia ({baseLabel})</Label>
            <Input
              value={formatNumber(difference)}
              disabled
              className={
                difference < 0
                  ? "text-red-600"
                  : difference > 0
                    ? "text-emerald-600"
                    : ""
              }
            />
            {unitCost > 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                Valor: {formatCurrency(valueDiff)}
              </p>
            ) : null}
          </div>

          <div>
            <Label>Motivo</Label>
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Registrado por *</Label>
            <Input
              value={form.registeredByName}
              onChange={(e) =>
                setForm({ ...form, registeredByName: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div>
          <Label>Notas</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Guardando..." : "Registrar ajuste"}
        </Button>
      </form>
    </Card>
  );
}
