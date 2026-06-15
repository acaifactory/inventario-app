"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { ProductSearch, type ProductOption } from "@/components/ui/ProductSearch";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { PurchaseLineUnitInput } from "@/components/forms/PurchaseLineUnitInput";
import { RecordActions } from "@/components/ui/RecordActions";
import { EXIT_REASONS } from "@/lib/constants";
import {
  exportMovementRecord,
  printMovementRecord,
  type MovementRecord,
} from "@/lib/export/movement-documents";
import {
  computeBaseQuantityFromLine,
  contentsPerUnitForSubmit,
  defaultPurchaseUnitForProduct,
  onDynamicUnitChange,
  validateDynamicLineConversion,
} from "@/lib/product-units-ui";
import { storeLocationLabel } from "@/lib/stores/default-location";
import {
  formatCurrency,
  formatDate,
  formatRegisteredQuantity,
} from "@/lib/utils";
import { X } from "lucide-react";

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
  const [records, setRecords] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    storeId: "",
    quantity: "",
    unit: "UNIT",
    contentsPerUnit: "",
    unitCost: "",
    exitReason: "SALE",
    supplierId: "",
    invoiceNumber: "",
    registeredByName: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  function refresh() {
    fetch(`/api/movements?type=${type}`)
      .then((r) => r.json())
      .then(setRecords);
  }

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
    refresh();
  }, [type]);

  const totalCost =
    type === "entry"
      ? Number(form.quantity || 0) * Number(form.unitCost || 0)
      : 0;

  const baseQtyPreview = computeBaseQuantityFromLine(
    selectedProduct,
    Number(form.quantity || 0),
    form.unit,
    form.contentsPerUnit
  );

  function resetForm(keepRegisteredBy = true) {
    setEditingId(null);
    setForm((f) => ({
      productId: "",
      storeId: "",
      quantity: "",
      unit: "UNIT",
      contentsPerUnit: "",
      unitCost: "",
      exitReason: "SALE",
      supplierId: "",
      invoiceNumber: "",
      registeredByName: keepRegisteredBy ? f.registeredByName : "",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
    }));
    setSelectedProduct(undefined);
    setError("");
  }

  async function startEdit(id: string) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/movements/${id}`);
    const movement = await res.json();
    if (!res.ok) {
      setError(movement.error ?? "No se pudo cargar");
      setLoading(false);
      return;
    }

    const product =
      products.find((p) => p.id === movement.productId) ?? movement.product;
    setSelectedProduct(product);
    const regQty = movement.registeredQuantity ?? movement.quantity;
    const regUnit = movement.registeredUnit ?? movement.product.unit;
    const unitCost =
      type === "entry" && movement.totalCost && regQty
        ? String(movement.totalCost / regQty)
        : movement.unitCost != null
          ? String(movement.unitCost)
          : "";

    setEditingId(id);
    setForm({
      productId: movement.productId,
      storeId: movement.location.storeId ?? "",
      quantity: String(regQty),
      unit: regUnit,
      contentsPerUnit: "",
      unitCost,
      exitReason: movement.exitReason ?? "SALE",
      supplierId: movement.supplierId ?? "",
      invoiceNumber: movement.invoiceNumber ?? "",
      registeredByName: movement.registeredByName,
      notes: movement.notes ?? "",
      date: movement.date.slice(0, 10),
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

    const contentsPerUnit = contentsPerUnitForSubmit(
      selectedProduct,
      form.unit,
      form.contentsPerUnit
    );

    const body =
      type === "entry"
        ? {
            kind: "entry",
            ...form,
            quantity: Number(form.quantity),
            unitCost: Number(form.unitCost),
            contentsPerUnit,
            supplierId: form.supplierId || undefined,
            invoiceNumber: form.invoiceNumber || undefined,
            notes: form.notes || undefined,
          }
        : {
            kind: "exit",
            productId: form.productId,
            storeId: form.storeId,
            quantity: Number(form.quantity),
            unit: form.unit,
            contentsPerUnit,
            exitReason: form.exitReason,
            registeredByName: form.registeredByName,
            notes: form.notes || undefined,
            date: form.date,
          };

    const endpoint = editingId
      ? `/api/movements/${editingId}`
      : type === "entry"
        ? "/api/movements/entry"
        : "/api/movements/exit";

    const res = await fetch(endpoint, {
      method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al registrar");
      setLoading(false);
      return;
    }

    resetForm();
    setLoading(false);
    refresh();
    router.refresh();
    document.getElementById(`historial-${type}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <>
      <Card className="mb-6 max-w-2xl">
        {editingId ? (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <span>
              Editando {type === "entry" ? "entrada" : "salida"} guardada
            </span>
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
                  const defaultUnit = defaultPurchaseUnitForProduct(product);
                  setForm({
                    ...form,
                    productId: id,
                    unit: defaultUnit,
                    contentsPerUnit: "",
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

            <PurchaseLineUnitInput
              product={selectedProduct}
              quantity={form.quantity}
              unit={form.unit}
              contentsPerUnit={form.contentsPerUnit}
              quantityLabel={
                type === "entry" ? "Cantidad de entrada" : "Cantidad de salida"
              }
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
                : type === "entry"
                  ? "Registrar entrada"
                  : "Registrar salida"}
          </Button>
        </form>
      </Card>

      <Card id={`historial-${type}`} className="max-w-3xl">
        <h3 className="mb-3 font-semibold">
          {type === "entry" ? "Entradas" : "Salidas"} guardadas
        </h3>
        <div className="space-y-3 text-sm">
          {records.length === 0 ? (
            <p className="text-slate-500">Aún no hay registros en esta sección.</p>
          ) : null}
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{record.product.name}</p>
                  <p className="text-slate-500">
                    {formatRegisteredQuantity({
                      quantity: record.quantity,
                      registeredQuantity: record.registeredQuantity,
                      registeredUnit: record.registeredUnit,
                      fallbackUnit: record.product.unit,
                    })}{" "}
                    · {storeLocationLabel(record.location)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(record.date)} · {record.registeredByName}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <RecordActions
                  onEdit={() => startEdit(record.id)}
                  onPrint={() => printMovementRecord(record, type)}
                  onExport={() => exportMovementRecord(record, type)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
