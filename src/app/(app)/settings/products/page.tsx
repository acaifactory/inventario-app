"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type DuplicateGroup = {
  key: string;
  canonical: string;
  items: { id: string; name: string; sku: string; stock: number }[];
};

export default function ProductsCatalogSettingsPage() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/products/normalize");
    const data = await res.json();
    setDuplicates(data.duplicates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function normalizeNames() {
    const res = await fetch("/api/products/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "normalize" }),
    });
    const data = await res.json();
    setMessage(`${data.updated ?? 0} nombres normalizados`);
    load();
  }

  async function mergeGroup(group: DuplicateGroup) {
    const [master, ...rest] = group.items;
    if (!master || rest.length === 0) return;

    await fetch("/api/products/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "merge",
        masterId: master.id,
        duplicateIds: rest.map((i) => i.id),
      }),
    });
    setMessage(`Fusionado en "${master.name}"`);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Catálogo — normalización"
        description="Reglas: Title Case, sin duplicados por variación de mayúsculas"
      />

      <div className="mb-4 flex gap-2">
        <Button onClick={normalizeNames}>Normalizar nombres</Button>
        <Button variant="outline" onClick={load}>
          Actualizar
        </Button>
      </div>

      {message ? (
        <p className="mb-4 text-sm text-emerald-700">{message}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            Posibles duplicados{" "}
            {!loading && (
              <Badge variant={duplicates.length ? "warning" : "info"}>
                {duplicates.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        {loading ? (
          <p className="text-sm text-slate-500">Analizando catálogo…</p>
        ) : duplicates.length === 0 ? (
          <p className="text-sm text-slate-500">
            No se detectaron duplicados. Empaques distintos (16 oz vs 24 oz) no
            se fusionan automáticamente.
          </p>
        ) : (
          <div className="space-y-4">
            {duplicates.map((group) => (
              <div
                key={group.key}
                className="rounded-xl border border-amber-200 bg-amber-50/30 p-4"
              >
                <p className="mb-2 font-medium text-slate-900">
                  Sugerido: {group.canonical}
                </p>
                <ul className="mb-3 space-y-1 text-sm text-slate-600">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      {item.name} · {item.sku} · stock {item.stock}
                    </li>
                  ))}
                </ul>
                <Button size="sm" onClick={() => mergeGroup(group)}>
                  Fusionar en primer registro
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
