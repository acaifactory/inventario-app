"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { ProductSearch, type ProductOption } from "@/components/ui/ProductSearch";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { UnitQuantityInput } from "@/components/forms/UnitQuantityInput";
import {
  defaultUnitForProduct,
  getUnitOptionsForProduct,
} from "@/lib/product-units-ui";
import { formatCurrency, formatQtyWithUnit, getUnitLabel } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Line = {
  productId: string;
  storeId: string;
  quantity: string;
  unit: string;
  totalPrice: string;
};

type Option = { id: string; name: string };

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  registeredByName: string;
  lines?: {
    quantity: number;
    unit: string;
    totalPrice: number;
    unitCost: number;
    product: { name: string; unit: string };
  }[];
};

export default function PurchasesPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [lineProducts, setLineProducts] = useState<
    Record<number, ProductOption | undefined>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [header, setHeader] = useState({
    invoiceNumber: "",
    supplierId: "",
    registeredByName: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([
    { productId: "", storeId: "", quantity: "", unit: "UNIT", totalPrice: "" },
  ]);

  function refresh() {
    fetch("/api/purchases")
      .then((r) => r.json())
      .then(setInvoices);
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
  }, []);

  const invoiceTotal = lines.reduce(
    (sum, line) => sum + Number(line.totalPrice || 0),
    0
  );

  function updateLine(index: number, patch: Partial<Line>) {
    const next = [...lines];
    next[index] = { ...next[index], ...patch };
    setLines(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...header,
        lines: lines.map((l) => {
          const store = stores.find((s) => s.id === l.storeId);
          return {
            productId: l.productId,
            locationId: store?.defaultLocationId,
            storeId: l.storeId,
            quantity: Number(l.quantity),
            unit: l.unit,
            totalPrice: Number(l.totalPrice),
          };
        }),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error");
      setLoading(false);
      return;
    }

    setHeader({
      invoiceNumber: "",
      supplierId: "",
      registeredByName: header.registeredByName,
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setLines([
      { productId: "", storeId: "", quantity: "", unit: "UNIT", totalPrice: "" },
    ]);
    setLineProducts({});
    setLoading(false);
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="Compras y facturas"
        description="Registra cantidad en la unidad de la factura (box, manga, lb…) — el sistema convierte inventario y costo a unidad base"
      />

      <Card className="mb-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nº factura *</Label>
              <Input
                value={header.invoiceNumber}
                onChange={(e) =>
                  setHeader({ ...header, invoiceNumber: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Proveedor *</Label>
              <Select
                value={header.supplierId}
                onChange={(e) =>
                  setHeader({ ...header, supplierId: e.target.value })
                }
                required
              >
                <option value="">Seleccionar</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={header.date}
                onChange={(e) =>
                  setHeader({ ...header, date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Registrado por *</Label>
              <Input
                value={header.registeredByName}
                onChange={(e) =>
                  setHeader({ ...header, registeredByName: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              Líneas de la factura
            </p>
            {lines.map((line, index) => {
              const product = lineProducts[index];
              const unitOptions = getUnitOptionsForProduct(product);
              const qty = Number(line.quantity || 0);
              const total = Number(line.totalPrice || 0);
              const unitLabel = getUnitLabel(line.unit);

              return (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2"
                >
                  <ProductSearch
                    value={line.productId}
                    onChange={(id, p) => {
                      setLineProducts({ ...lineProducts, [index]: p });
                      updateLine(index, {
                        productId: id,
                        unit: defaultUnitForProduct(p),
                      });
                    }}
                    products={products}
                    required
                  />

                  <StoreSearch
                    label="Tienda destino"
                    value={line.storeId}
                    onChange={(id) => updateLine(index, { storeId: id })}
                    stores={stores}
                    required
                  />

                  <UnitQuantityInput
                    quantity={line.quantity}
                    unit={line.unit}
                    units={unitOptions}
                    onQuantityChange={(quantity) =>
                      updateLine(index, { quantity })
                    }
                    onUnitChange={(unit) => updateLine(index, { unit })}
                    required
                  />

                  <div>
                    <Label>Precio total de la línea ($) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.totalPrice}
                      onChange={(e) =>
                        updateLine(index, { totalPrice: e.target.value })
                      }
                      required
                    />
                    {qty > 0 && total > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatCurrency(total / qty)} / {unitLabel} · Total{" "}
                        {formatCurrency(total)}
                      </p>
                    ) : null}
                    {product && qty > 0 && total > 0 ? (
                      <p className="mt-0.5 text-xs text-violet-600">
                        Se convertirá a unidad base ({getUnitLabel(product.unit ?? "UNIT")})
                        al guardar
                      </p>
                    ) : null}
                  </div>

                  {lines.length > 1 ? (
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setLines(lines.filter((_, i) => i !== index));
                          setLineProducts(
                            Object.fromEntries(
                              Object.entries(lineProducts).filter(
                                ([i]) => Number(i) !== index
                              )
                            )
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Quitar línea
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    productId: "",
                    storeId: "",
                    quantity: "",
                    unit: "UNIT",
                    totalPrice: "",
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Agregar línea
            </Button>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              value={header.notes}
              onChange={(e) =>
                setHeader({ ...header, notes: e.target.value })
              }
            />
          </div>

          <p className="text-lg font-semibold">
            Total factura: {formatCurrency(invoiceTotal)}
          </p>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Guardando..." : "Guardar factura y actualizar inventario"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Facturas recientes</h3>
        <div className="space-y-3 text-sm">
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex justify-between font-medium">
                <span>
                  {inv.invoiceNumber} · {inv.registeredByName}
                </span>
                <span>{formatCurrency(inv.totalAmount)}</span>
              </div>
              {inv.lines?.slice(0, 3).map((l, i) => (
                <p key={i} className="mt-1 text-xs text-slate-500">
                  {l.product.name}:{" "}
                  {formatQtyWithUnit(l.quantity, l.unit)} ={" "}
                  {formatCurrency(l.totalPrice)} (
                  {formatCurrency(l.unitCost)}/{getUnitLabel(l.unit)})
                </p>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
