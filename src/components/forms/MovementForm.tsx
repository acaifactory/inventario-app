"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { ProductSearch, type ProductOption } from "@/components/ui/ProductSearch";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { UnitQuantityInput } from "@/components/forms/UnitQuantityInput";
import { EXIT_REASONS } from "@/lib/constants";
import {
  defaultUnitForProduct,
  getUnitOptionsForProduct,
} from "@/lib/product-units-ui";
import { formatCurrency } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface MovementFormProps {
  type: "entry" | "exit";
}

export function MovementForm({ type }: MovementFormProps) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption>();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productId: "",
    storeId: "",
    quantity: "",
    unit: "UNIT",
    unitCost: "",
    exitReason: "SALE",
    supplierId: "",
    invoiceNumber: "",
    registeredByName: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const unitOptions = useMemo(
    () => getUnitOptionsForProduct(selectedProduct),
    [selectedProduct]
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/stores").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
    ]).then(([p, s, sup]) => {
      setProducts(p);
      setStores(s);
      setSuppliers(sup);
    });
  }, []);

  const totalCost =
    type === "entry"
      ? Number(form.quantity || 0) * Number(form.unitCost || 0)
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint =
      type === "entry" ? "/api/movements/entry" : "/api/movements/exit";

    const body =
      type === "entry"
        ? {
            ...form,
            quantity: Number(form.quantity),
            unitCost: Number(form.unitCost),
            supplierId: form.supplierId || undefined,
            invoiceNumber: form.invoiceNumber || undefined,
            notes: form.notes || undefined,
          }
        : {
            productId: form.productId,
            storeId: form.storeId,
            quantity: Number(form.quantity),
            unit: form.unit,
            exitReason: form.exitReason,
            registeredByName: form.registeredByName,
            notes: form.notes || undefined,
            date: form.date,
          };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrar");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ProductSearch
              value={form.productId}
              onChange={(id, product) => {
                setSelectedProduct(product);
                const defaultUnit = defaultUnitForProduct(product);
                setForm({
                  ...form,
                  productId: id,
                  unit: defaultUnit,
                  unitCost:
                    type === "entry" && product?.averageCost
                      ? String(product.averageCost)
                      : form.unitCost,
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

          <UnitQuantityInput
            quantity={form.quantity}
            unit={form.unit}
            units={unitOptions}
            onQuantityChange={(quantity) => setForm({ ...form, quantity })}
            onUnitChange={(unit) => setForm({ ...form, unit })}
            required
          />

          <div className="sm:col-span-2">
            <Label>Registrado por *</Label>
            <Input
              value={form.registeredByName}
              onChange={(e) =>
                setForm({ ...form, registeredByName: e.target.value })
              }
              placeholder="Nombre de quien registra"
              required
            />
          </div>

          {type === "entry" ? (
            <>
              <div>
                <Label>Costo unitario (por unidad registrada)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) =>
                    setForm({ ...form, unitCost: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Costo total</Label>
                <Input value={formatCurrency(totalCost)} disabled />
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
              <div>
                <Label>Nº factura</Label>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    setForm({ ...form, invoiceNumber: e.target.value })
                  }
                />
              </div>
            </>
          ) : (
            <div>
              <Label>Motivo</Label>
              <Select
                value={form.exitReason}
                onChange={(e) =>
                  setForm({ ...form, exitReason: e.target.value })
                }
                required
              >
                {EXIT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
          {loading
            ? "Guardando..."
            : type === "entry"
              ? "Registrar entrada"
              : "Registrar salida"}
        </Button>
      </form>
    </Card>
  );
}
