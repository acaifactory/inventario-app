"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";

type SupplierRow = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  _count: {
    products: number;
    purchaseInvoices: number;
    movements: number;
  };
};

export function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/suppliers?all=true");
    if (!res.ok) {
      setError("Sin permisos para gestionar proveedores");
      setLoading(false);
      return;
    }
    setSuppliers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createSupplier(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear");
      return;
    }

    setForm({ name: "", contact: "", phone: "", email: "" });
    setShowForm(false);
    setMessage(`Proveedor "${data.name}" guardado`);
    load();
  }

  async function deactivate(id: string, name: string) {
    if (
      !confirm(
        `¿Desactivar "${name}"?\n\nNo se borra el historial: facturas y movimientos se conservan.`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al desactivar");
      return;
    }
    setMessage(data.message ?? "Proveedor desactivado");
    load();
  }

  async function reactivate(id: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al reactivar");
      return;
    }
    setMessage(`Proveedor "${data.name}" reactivado`);
    load();
  }

  const activeCount = suppliers.filter((s) => s.active).length;

  return (
    <div>
      <PageHeader
        title="Proveedores / Distribuidores"
        description="Alta y baja sin perder historial de compras ni movimientos"
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "Nuevo distribuidor"}
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {message ? (
        <p className="mb-4 text-sm text-emerald-600">{message}</p>
      ) : null}

      {showForm ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Agregar distribuidor</CardTitle>
          </CardHeader>
          <form
            onSubmit={createSupplier}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Distribuidora Tropical"
                required
              />
            </div>
            <div>
              <Label>Contacto</Label>
              <Input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Correo</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Guardar distribuidor</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            Catálogo ({activeCount} activos / {suppliers.length} total)
          </CardTitle>
        </CardHeader>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{s.name}</p>
                    {!s.active ? (
                      <Badge variant="danger">Inactivo</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-500">
                    {[s.contact, s.phone, s.email].filter(Boolean).join(" · ") ||
                      "Sin datos de contacto"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {s._count.products} productos · {s._count.purchaseInvoices}{" "}
                    facturas · {s._count.movements} movimientos
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deactivate(s.id, s.name)}
                    >
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reactivate(s.id)}
                    >
                      Reactivar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {suppliers.length === 0 && (
              <p className="py-4 text-sm text-slate-500">
                No hay proveedores registrados
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
