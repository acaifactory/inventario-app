"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { ProductSearch, type ProductOption } from "@/components/ui/ProductSearch";
import { StoreSearch, type StoreOption } from "@/components/ui/StoreSearch";
import { PurchaseLineUnitInput } from "@/components/forms/PurchaseLineUnitInput";
import { Badge } from "@/components/ui/Badge";
import { storeLocationLabel } from "@/lib/stores/default-location";
import {
  contentsPerUnitForSubmit,
  defaultPurchaseUnitForProduct,
  onDynamicUnitChange,
  validateDynamicLineConversion,
} from "@/lib/product-units-ui";
import {
  formatCurrency,
  formatRegisteredQuantity,
  formatNumber,
  getUnitLabel,
  loanPendingInRegisteredUnit,
} from "@/lib/utils";
import { LOAN_STATUS_LABELS } from "@/lib/constants";

type Loan = {
  id: string;
  productId: string;
  direction: "OUT" | "IN";
  quantity: number;
  quantityReturned: number;
  registeredUnit: string | null;
  registeredQuantity: number | null;
  status: keyof typeof LOAN_STATUS_LABELS;
  counterpartyName: string;
  responsibleName: string;
  registeredByName: string;
  totalCost: number;
  product: { name: string; unit: string };
  location: { name: string; store?: { name: string } | null };
};

export default function LoansPage() {
  const [tab, setTab] = useState<"OUT" | "IN">("OUT");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption>();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [returnQty, setReturnQty] = useState<
    Record<string, { quantity: string; unit: string; contentsPerUnit: string }>
  >({});
  const [form, setForm] = useState({
    productId: "",
    storeId: "",
    quantity: "",
    unit: "UNIT",
    contentsPerUnit: "",
    counterpartyName: "",
    responsibleName: "",
    registeredByName: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  function refresh(direction = tab) {
    fetch(`/api/loans?direction=${direction}`)
      .then((r) => r.json())
      .then(setLoans);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/stores").then((r) => r.json()),
    ]).then(([p, s]) => {
      setProducts(p);
      setStores(s);
    });
  }, []);

  useEffect(() => {
    refresh(tab);
  }, [tab]);

  async function createLoan(e: React.FormEvent) {
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

    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: tab,
        ...form,
        quantity: Number(form.quantity),
        contentsPerUnit: contentsPerUnitForSubmit(
          selectedProduct,
          form.unit,
          form.contentsPerUnit
        ),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error");
      setLoading(false);
      return;
    }

    setSelectedProduct(undefined);
    setForm({
      productId: "",
      storeId: "",
      quantity: "",
      unit: "UNIT",
      contentsPerUnit: "",
      counterpartyName: "",
      responsibleName: "",
      registeredByName: form.registeredByName,
      notes: "",
      date: new Date().toISOString().slice(0, 10),
    });
    setLoading(false);
    refresh();
  }

  async function submitReturn(loan: Loan) {
    const entry = returnQty[loan.id];
    const qty = Number(entry?.quantity);
    if (!qty) return;

    const loanProduct = products.find((p) => p.id === loan.productId);
    const returnUnit = entry?.unit ?? loan.registeredUnit ?? loan.product.unit;
    const validation = validateDynamicLineConversion(
      loanProduct,
      returnUnit,
      entry?.contentsPerUnit ?? ""
    );
    if (validation) {
      setError(validation);
      return;
    }

    const res = await fetch("/api/loans/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loanId: loan.id,
        quantity: qty,
        unit: returnUnit,
        contentsPerUnit: contentsPerUnitForSubmit(
          loanProduct,
          returnUnit,
          entry?.contentsPerUnit ?? ""
        ),
        registeredByName: form.registeredByName || "Operador",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error en devolución");
      return;
    }

    setReturnQty({
      ...returnQty,
      [loan.id]: { quantity: "", unit: returnUnit, contentsPerUnit: "" },
    });
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="Préstamos"
        description="Préstamo OUT (prestamos mercancía) e IN (recibimos prestado)"
      />

      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          variant={tab === "OUT" ? "primary" : "secondary"}
          onClick={() => setTab("OUT")}
        >
          Préstamo OUT
        </Button>
        <Button
          type="button"
          variant={tab === "IN" ? "primary" : "secondary"}
          onClick={() => setTab("IN")}
        >
          Préstamo IN
        </Button>
      </div>

      <Card className="mb-6 max-w-2xl">
        <form onSubmit={createLoan} className="space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
              quantityLabel="Cantidad del préstamo"
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
              <Label>{tab === "OUT" ? "Destinatario" : "Quién prestó"}</Label>
              <Input
                value={form.counterpartyName}
                onChange={(e) =>
                  setForm({ ...form, counterpartyName: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Responsable</Label>
              <Input
                value={form.responsibleName}
                onChange={(e) =>
                  setForm({ ...form, responsibleName: e.target.value })
                }
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
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notas"
          />
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={loading}>
            Registrar préstamo {tab}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Activos — {tab}</h3>
        <div className="space-y-3">
          {loans.map((loan) => {
            const pendingRegistered = loanPendingInRegisteredUnit(loan);
            const loanUnit = loan.registeredUnit ?? loan.product.unit;
            const loanProduct = products.find((p) => p.id === loan.productId);
            const returnEntry = returnQty[loan.id] ?? {
              quantity: "",
              unit: loanUnit,
              contentsPerUnit: "",
            };

            return (
              <div
                key={loan.id}
                className="rounded-xl border border-slate-200 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{loan.product.name}</p>
                    <p className="text-slate-500">
                      {loan.counterpartyName} · {storeLocationLabel(loan.location)}
                    </p>
                  </div>
                  <Badge>{LOAN_STATUS_LABELS[loan.status]}</Badge>
                </div>
                <p className="mt-2">
                  {formatRegisteredQuantity({
                    quantity: pendingRegistered,
                    registeredQuantity: pendingRegistered,
                    registeredUnit: loanUnit,
                    fallbackUnit: loan.product.unit,
                  })}{" "}
                  pendiente de{" "}
                  {formatRegisteredQuantity({
                    quantity: loan.quantity,
                    registeredQuantity: loan.registeredQuantity,
                    registeredUnit: loan.registeredUnit,
                    fallbackUnit: loan.product.unit,
                  })}{" "}
                  · {formatCurrency(loan.totalCost)}
                </p>
                {pendingRegistered > 0 ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <PurchaseLineUnitInput
                      product={loanProduct}
                      quantity={returnEntry.quantity}
                      unit={returnEntry.unit}
                      contentsPerUnit={returnEntry.contentsPerUnit}
                      quantityLabel="Cantidad a devolver"
                      onQuantityChange={(quantity) =>
                        setReturnQty({
                          ...returnQty,
                          [loan.id]: { ...returnEntry, quantity },
                        })
                      }
                      onUnitChange={(unit) =>
                        setReturnQty({
                          ...returnQty,
                          [loan.id]: {
                            ...returnEntry,
                            unit,
                            ...onDynamicUnitChange(loanProduct, unit),
                          },
                        })
                      }
                      onContentsPerUnitChange={(contentsPerUnit) =>
                        setReturnQty({
                          ...returnQty,
                          [loan.id]: { ...returnEntry, contentsPerUnit },
                        })
                      }
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => submitReturn(loan)}
                      >
                        Devolver
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
