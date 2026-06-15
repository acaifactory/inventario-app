"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { ProductSearch, type ProductOption } from "@/components/ui/ProductSearch";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { PurchaseLineUnitInput } from "@/components/forms/PurchaseLineUnitInput";
import { RecordActions } from "@/components/ui/RecordActions";
import {
  exportTransferRecord,
  printTransferRecord,
  type TransferRecord,
} from "@/lib/export/movement-documents";
import {
  contentsPerUnitForSubmit,
  defaultPurchaseUnitForProduct,
  onDynamicUnitChange,
  validateDynamicLineConversion,
} from "@/lib/product-units-ui";
import { storeLocationLabel } from "@/lib/stores/default-location";
import { formatDate, formatRegisteredQuantity } from "@/lib/utils";
import { X } from "lucide-react";

export function TransferForm() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption>();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    fromStoreId: "",
    toStoreId: "",
    quantity: "",
    unit: "UNIT",
    contentsPerUnit: "",
    registeredByName: "",
    deliveredByName: "",
    receivedByName: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  function refresh() {
    fetch("/api/transfers")
      .then((r) => r.json())
      .then(setRecords);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/stores").then((r) => r.json()),
    ]).then(([p, s]) => {
      setProducts(p);
      setStores(s);
    });
    refresh();
  }, []);

  function resetForm(keepRegisteredBy = true) {
    setEditingId(null);
    setForm((f) => ({
      productId: "",
      fromStoreId: "",
      toStoreId: "",
      quantity: "",
      unit: "UNIT",
      contentsPerUnit: "",
      registeredByName: keepRegisteredBy ? f.registeredByName : "",
      deliveredByName: "",
      receivedByName: "",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
    }));
    setSelectedProduct(undefined);
    setError("");
  }

  async function startEdit(id: string) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/transfers/${id}`);
    const transfer = await res.json();
    if (!res.ok) {
      setError(transfer.error ?? "No se pudo cargar");
      setLoading(false);
      return;
    }

    const product =
      products.find((p) => p.id === transfer.productId) ?? transfer.product;
    setSelectedProduct(product);
    const regQty = transfer.registeredQuantity ?? transfer.quantity;
    const regUnit = transfer.registeredUnit ?? transfer.product.unit;

    setEditingId(id);
    setForm({
      productId: transfer.productId,
      fromStoreId: transfer.fromLocation.storeId ?? "",
      toStoreId: transfer.toLocation.storeId ?? "",
      quantity: String(regQty),
      unit: regUnit,
      contentsPerUnit: "",
      registeredByName: transfer.registeredByName,
      deliveredByName: transfer.deliveredByName ?? "",
      receivedByName: transfer.receivedByName ?? "",
      notes: transfer.notes ?? "",
      date: transfer.date.slice(0, 10),
    });
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

    if (form.fromStoreId === form.toStoreId) {
      setError("Origen y destino deben ser tiendas diferentes");
      setLoading(false);
      return;
    }

    const payload = {
      ...form,
      quantity: Number(form.quantity),
      contentsPerUnit: contentsPerUnitForSubmit(
        selectedProduct,
        form.unit,
        form.contentsPerUnit
      ),
    };

    const res = await fetch(
      editingId ? `/api/transfers/${editingId}` : "/api/transfers",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error");
      setLoading(false);
      return;
    }

    resetForm();
    setLoading(false);
    refresh();
    document.getElementById("historial-transferencias")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <>
      <Card className="mb-6 max-w-2xl">
        {editingId ? (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <span>Editando transferencia guardada</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => resetForm()}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        ) : null}
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
                    unit: defaultPurchaseUnitForProduct(product),
                    contentsPerUnit: "",
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

            <PurchaseLineUnitInput
              product={selectedProduct}
              quantity={form.quantity}
              unit={form.unit}
              contentsPerUnit={form.contentsPerUnit}
              totalPrice=""
              quantityLabel="Cantidad a transferir"
              onQuantityChange={(quantity) => setForm({ ...form, quantity })}
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

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={loading}>
            {loading
              ? "Guardando..."
              : editingId
                ? "Guardar cambios"
                : "Registrar transferencia"}
          </Button>
        </form>
      </Card>

      <Card id="historial-transferencias" className="max-w-3xl">
        <h3 className="mb-3 font-semibold">Transferencias guardadas</h3>
        <div className="space-y-3 text-sm">
          {records.length === 0 ? (
            <p className="text-slate-500">Aún no hay transferencias.</p>
          ) : null}
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div>
                <p className="font-medium">{record.product.name}</p>
                <p className="text-slate-500">
                  {storeLocationLabel(record.fromLocation)} →{" "}
                  {storeLocationLabel(record.toLocation)}
                </p>
                <p className="text-slate-500">
                  {formatRegisteredQuantity({
                    quantity: record.quantity,
                    registeredQuantity: record.registeredQuantity,
                    registeredUnit: record.registeredUnit,
                    fallbackUnit: record.product.unit,
                  })}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(record.date)} · {record.registeredByName}
                </p>
              </div>
              <div className="mt-3">
                <RecordActions
                  onEdit={() => startEdit(record.id)}
                  onPrint={() => printTransferRecord(record)}
                  onExport={() => exportTransferRecord(record)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
