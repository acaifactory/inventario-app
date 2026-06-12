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
import { UnitQuantityInput } from "@/components/forms/UnitQuantityInput";
import {
  defaultUnitForProduct,
  getUnitOptionsForProduct,
} from "@/lib/product-units-ui";

export function TransferForm() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption>();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productId: "",
    fromStoreId: "",
    toStoreId: "",
    quantity: "",
    unit: "UNIT",
    registeredByName: "",
    deliveredByName: "",
    receivedByName: "",
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
    ]).then(([p, s]) => {
      setProducts(p);
      setStores(s);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.fromStoreId === form.toStoreId) {
      setError("Origen y destino deben ser tiendas diferentes");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quantity: Number(form.quantity),
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
    setForm({
      productId: "",
      fromStoreId: "",
      toStoreId: "",
      quantity: "",
      unit: "UNIT",
      registeredByName: form.registeredByName,
      deliveredByName: "",
      receivedByName: "",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
    });
    setSelectedProduct(undefined);
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
                setForm({
                  ...form,
                  productId: id,
                  unit: defaultUnitForProduct(product),
                });
              }}
              products={products}
              required
            />
          </div>

          <StoreSearch
            label="Tienda origen"
            value={form.fromStoreId}
            onChange={(id) => setForm({ ...form, fromStoreId: id })}
            stores={stores}
            excludeStoreId={form.toStoreId}
            required
          />

          <StoreSearch
            label="Tienda destino"
            value={form.toStoreId}
            onChange={(id) => setForm({ ...form, toStoreId: id })}
            stores={stores}
            excludeStoreId={form.fromStoreId}
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

          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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

          <div>
            <Label>Responsable entrega</Label>
            <Input
              value={form.deliveredByName}
              onChange={(e) =>
                setForm({ ...form, deliveredByName: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Responsable recibe</Label>
            <Input
              value={form.receivedByName}
              onChange={(e) =>
                setForm({ ...form, receivedByName: e.target.value })
              }
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
          {loading ? "Transfiriendo..." : "Registrar transferencia"}
        </Button>
      </form>
    </Card>
  );
}
