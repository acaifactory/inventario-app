"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { STORE_TYPES } from "@/lib/constants";
import { suggestStoreCode } from "@/lib/stores/store-setup";
import { Plus } from "lucide-react";

type StoreRow = {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string | null;
  address: string | null;
  locations: { id: string; name: string }[];
};

export function StoresSettingsClient() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "FRANCHISE",
    city: "",
    address: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/stores");
    if (!res.ok) {
      setError("No se pudieron cargar las tiendas");
      setLoading(false);
      return;
    }
    setStores(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createStore(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al crear la tienda");
      setSaving(false);
      return;
    }

    setForm({
      name: "",
      code: "",
      type: "FRANCHISE",
      city: "",
      address: "",
    });
    setShowForm(false);
    setMessage(`Tienda "${data.name}" creada con ${data.locationCount} áreas`);
    setSaving(false);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Tiendas y franquicias"
        description="Cada tienda incluye Cocina, Freezer, Almacén seco y Mostrador"
        action={
          <Button type="button" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? "Cerrar formulario" : "Añadir tienda"}
          </Button>
        }
      />

      {showForm ? (
        <Card className="mb-6 max-w-xl">
          <form onSubmit={createStore} className="space-y-4">
            <div>
              <Label>Nombre de la tienda *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    code: f.code || suggestStoreCode(name),
                  }));
                }}
                placeholder="Açaí Factory — Caguas"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Código</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="AF-CAG-001"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Opcional. Si lo dejas vacío se genera del nombre.
                </p>
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                >
                  {STORE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Ciudad</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Caguas"
                />
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Puerto Rico"
                />
              </div>
            </div>
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Crear tienda"}
            </Button>
          </form>
        </Card>
      ) : null}

      {message ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando tiendas...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stores.map((store) => (
            <Card key={store.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{store.name}</p>
                  <p className="text-sm text-slate-500">{store.code}</p>
                  {store.city ? (
                    <p className="text-sm text-slate-500">{store.city}</p>
                  ) : null}
                </div>
                <Badge variant="info">
                  {STORE_TYPES.find((t) => t.value === store.type)?.label}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {store.locations.length} localidades:{" "}
                {store.locations.map((l) => l.name).join(", ")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
