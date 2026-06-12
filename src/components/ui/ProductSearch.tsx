"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

export type ProductUnitRow = {
  unit: string;
  conversionFactor: number;
  label?: string | null;
};

export type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string;
  units?: ProductUnitRow[];
  averageCost?: number;
  category?: { name: string };
};

type Props = {
  label?: string;
  value: string;
  onChange: (productId: string, product?: ProductOption) => void;
  products: ProductOption[];
  required?: boolean;
  className?: string;
};

export function ProductSearch({
  label = "Producto",
  value,
  onChange,
  products,
  required,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected?.id, selected?.name]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 12);
  }, [products, query]);

  return (
    <div className={cn("relative", className)}>
      <Label>{label}</Label>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value) onChange("");
        }}
        placeholder="Buscar producto..."
        required={required && !value}
        autoComplete="off"
      />
      {query && !selected && filtered.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50"
                onClick={() => {
                  onChange(p.id, p);
                  setQuery(p.name);
                }}
              >
                <span className="font-medium">{p.name}</span>
                {p.sku ? (
                  <span className="ml-2 text-xs text-slate-400">{p.sku}</span>
                ) : null}
                {p.category ? (
                  <span className="block text-xs text-slate-500">
                    {p.category.name}
                    {p.unit ? ` · ${p.unit}` : ""}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input type="hidden" name="productId" value={value} />
    </div>
  );
}
