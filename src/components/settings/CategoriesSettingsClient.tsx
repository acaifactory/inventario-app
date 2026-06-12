"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
};

export function CategoriesSettingsClient() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear");
      return;
    }
    setNewName("");
    load();
  }

  async function saveEdit(id: string) {
    setError("");
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al actualizar");
      return;
    }
    setEditingId(null);
    load();
  }

  async function removeCategory(id: string, name: string) {
    if (!confirm(`¿Eliminar categoría "${name}"?`)) return;
    setError("");
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al eliminar");
      return;
    }
    load();
  }

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Organiza el catálogo — Bases, Frutas, Toppings, Empaques, etc."
      />

      {error ? (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nueva categoría</CardTitle>
        </CardHeader>
        <form onSubmit={createCategory} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Label>Nombre</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Frutas"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Agregar</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorías ({categories.length})</CardTitle>
        </CardHeader>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                {editingId === cat.id ? (
                  <div className="flex flex-1 gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9"
                    />
                    <Button onClick={() => saveEdit(cat.id)}>Guardar</Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-slate-900">{cat.name}</p>
                      <p className="text-xs text-slate-400">{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">
                        {cat._count.products} productos
                      </Badge>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditName(cat.name);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => removeCategory(cat.id, cat.name)}
                        disabled={cat._count.products > 0}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
