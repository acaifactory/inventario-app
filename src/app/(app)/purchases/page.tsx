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
import { PurchaseLineUnitInput } from "@/components/forms/PurchaseLineUnitInput";
import {
  defaultPurchaseUnitForProduct,
  purchaseUnitNeedsConversion,
  suggestedContentsPerUnit,
} from "@/lib/product-units-ui";
import { formatCurrency, formatQtyWithUnit, getUnitLabel, formatDate } from "@/lib/utils";
import {
  exportInvoiceSpreadsheet,
  printInvoicePortrait,
  type InvoiceExportData,
} from "@/lib/export/invoice-export";
import { Download, Pencil, Plus, Printer, Trash2, X } from "lucide-react";

type Line = {
  productId: string;
  storeId: string;
  quantity: string;
  unit: string;
  contentsPerUnit: string;
  totalPrice: string;
};

type Option = { id: string; name: string };

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  registeredByName: string;
  supplier?: { name: string };
  lines?: {
    quantity: number;
    unit: string;
    contentsPerUnit: number | null;
    baseUnit: string | null;
    baseQuantity: number | null;
    baseUnitCost: number | null;
    totalPrice: number;
    unitCost: number;
    product: { name: string; unit: string };
  }[];
};

function toExportData(inv: InvoiceRow): InvoiceExportData {
  return {
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    supplier: { name: inv.supplier?.name ?? "—" },
    totalAmount: inv.totalAmount,
    lines: (inv.lines ?? []).map((line) => ({
      product: { name: line.product.name },
      totalPrice: line.totalPrice,
    })),
  };
}

function emptyLine(): Line {
  return {
    productId: "",
    storeId: "",
    quantity: "",
    unit: "UNIT",
    contentsPerUnit: "",
    totalPrice: "",
  };
}

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
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm(keepRegisteredBy = true) {
    setEditingId(null);
    setHeader((h) => ({
      invoiceNumber: "",
      supplierId: "",
      registeredByName: keepRegisteredBy ? h.registeredByName : "",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    }));
    setLines([emptyLine()]);
    setLineProducts({});
    setError("");
  }

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

  function handleUnitChange(index: number, unit: string, product?: ProductOption) {
    const needs = purchaseUnitNeedsConversion(product, unit);
    const suggested = suggestedContentsPerUnit(product, unit);
    updateLine(index, {
      unit,
      contentsPerUnit: needs
        ? suggested != null
          ? String(suggested)
          : ""
        : "",
    });
  }

  async function startEdit(id: string) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/purchases/${id}`);
    const inv = await res.json();
    if (!res.ok) {
      setError(inv.error ?? "No se pudo cargar la factura");
      setLoading(false);
      return;
    }

    setEditingId(id);
    setHeader({
      invoiceNumber: inv.invoiceNumber,
      supplierId: inv.supplierId,
      registeredByName: inv.registeredByName,
      date: inv.date.slice(0, 10),
      notes: inv.notes ?? "",
    });

    const nextLines: Line[] =
      inv.lines?.length > 0
        ? inv.lines.map(
            (line: {
              productId: string;
              quantity: number;
              unit: string;
              contentsPerUnit: number | null;
              totalPrice: number;
              location: { storeId: string | null };
            }) => ({
              productId: line.productId,
              storeId: line.location.storeId ?? "",
              quantity: String(line.quantity),
              unit: line.unit,
              contentsPerUnit:
                line.contentsPerUnit != null
                  ? String(line.contentsPerUnit)
                  : "",
              totalPrice: String(line.totalPrice),
            })
          )
        : [emptyLine()];

    setLines(nextLines);

    const nextLineProducts: Record<number, ProductOption | undefined> = {};
    inv.lines?.forEach(
      (
        line: { productId: string; product: ProductOption },
        index: number
      ) => {
        const product =
          products.find((p) => p.id === line.productId) ?? line.product;
        nextLineProducts[index] = product;
      }
    );
    setLineProducts(nextLineProducts);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    for (let i = 0; i < lines.length; i++) {
      const product = lineProducts[i];
      const line = lines[i];
      if (
        product &&
        purchaseUnitNeedsConversion(product, line.unit) &&
        (!line.contentsPerUnit || Number(line.contentsPerUnit) <= 0)
      ) {
        setError(
          `Línea ${i + 1}: indica cuánto contiene cada ${getUnitLabel(line.unit)} en ${getUnitLabel(product.unit ?? "UNIT")}.`
        );
        setLoading(false);
        return;
      }
    }

    const payload = {
      ...header,
      lines: lines.map((l, lineIndex) => {
        const store = stores.find((s) => s.id === l.storeId);
        const product = lineProducts[lineIndex];
        const needsConversion =
          product && purchaseUnitNeedsConversion(product, l.unit);
        return {
          productId: l.productId,
          locationId: store?.defaultLocationId,
          storeId: l.storeId,
          quantity: Number(l.quantity),
          unit: l.unit,
          contentsPerUnit: needsConversion
            ? Number(l.contentsPerUnit)
            : undefined,
          totalPrice: Number(l.totalPrice),
        };
      }),
    };

    const res = await fetch(
      editingId ? `/api/purchases/${editingId}` : "/api/purchases",
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
    document
      .getElementById("facturas-guardadas")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <PageHeader
        title="Compras y facturas"
        description="Indica la unidad recibida y, si aplica, cuánto contiene cada empaque. El inventario y costo se calculan en la unidad base del producto."
      />

      <Card className="mb-6 max-w-4xl">
        {editingId ? (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <span>Editando factura guardada</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => resetForm()}>
              <X className="h-4 w-4" />
              Cancelar edición
            </Button>
          </div>
        ) : null}
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
              const total = Number(line.totalPrice || 0);
              const qty = Number(line.quantity || 0);
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
                      const baseUnit = defaultPurchaseUnitForProduct(p);
                      updateLine(index, {
                        productId: id,
                        unit: baseUnit,
                        contentsPerUnit: "",
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

                  <PurchaseLineUnitInput
                    product={product}
                    quantity={line.quantity}
                    unit={line.unit}
                    contentsPerUnit={line.contentsPerUnit}
                    totalPrice={line.totalPrice}
                    onQuantityChange={(quantity) =>
                      updateLine(index, { quantity })
                    }
                    onUnitChange={(unit) =>
                      handleUnitChange(index, unit, product)
                    }
                    onContentsPerUnitChange={(contentsPerUnit) =>
                      updateLine(index, { contentsPerUnit })
                    }
                    required
                  />

                  <div>
                    <Label>Precio total de la línea ($) *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.totalPrice}
                      onChange={(e) =>
                        updateLine(index, { totalPrice: e.target.value })
                      }
                      required
                    />
                    {qty > 0 && total > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatCurrency(total / qty)} / {unitLabel} recibido
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
              onClick={() => setLines([...lines, emptyLine()])}
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
            {loading
              ? "Guardando..."
              : editingId
                ? "Guardar cambios y actualizar inventario"
                : "Guardar factura y actualizar inventario"}
          </Button>
        </form>
      </Card>

      <Card id="facturas-guardadas">
        <h3 className="mb-1 font-semibold">Facturas guardadas</h3>
        <p className="mb-4 text-sm text-slate-500">
          Después de guardar una factura, aquí verás los botones{" "}
          <strong>Editar</strong>, <strong>Imprimir</strong> y{" "}
          <strong>Exportar</strong>.
        </p>
        <div className="space-y-3 text-sm">
          {invoices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-500">
              Aún no hay facturas. Completa el formulario de arriba y pulsa
              &quot;Guardar factura&quot; — los botones aparecerán en esta
              sección.
            </p>
          ) : null}
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 font-medium">
                <div>
                  <p>
                    {inv.invoiceNumber} · {inv.supplier?.name ?? "Sin proveedor"}
                  </p>
                  <p className="text-xs font-normal text-slate-500">
                    {formatDate(inv.date)} · {inv.registeredByName}
                  </p>
                </div>
                <span>{formatCurrency(inv.totalAmount)}</span>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs text-slate-600">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="pb-1 pr-3 font-medium">Producto</th>
                      <th className="pb-1 font-medium text-right">Precio total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lines?.map((l, i) => (
                      <tr key={i}>
                        <td className="py-0.5 pr-3">{l.product.name}</td>
                        <td className="py-0.5 text-right">
                          {formatCurrency(l.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startEdit(inv.id)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => printInvoicePortrait(toExportData(inv))}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => exportInvoiceSpreadsheet(toExportData(inv))}
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
