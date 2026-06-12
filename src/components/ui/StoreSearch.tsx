"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

export type StoreOption = {
  id: string;
  name: string;
  code?: string;
  city?: string | null;
  defaultLocationId?: string | null;
};

type Props = {
  label?: string;
  value: string;
  onChange: (storeId: string, store?: StoreOption) => void;
  stores: StoreOption[];
  excludeStoreId?: string;
  required?: boolean;
  className?: string;
};

export function StoreSearch({
  label = "Tienda",
  value,
  onChange,
  stores,
  excludeStoreId,
  required,
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const selected = stores.find((s) => s.id === value);

  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [selected?.id, selected?.name]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = excludeStoreId
      ? stores.filter((s) => s.id !== excludeStoreId)
      : stores;

    if (!q) return pool.slice(0, 12);

    return pool
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code?.toLowerCase().includes(q) ?? false) ||
          (s.city?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 12);
  }, [stores, query, excludeStoreId]);

  const showSuggestions =
    query.trim().length > 0 &&
    (!selected || query.trim().toLowerCase() !== selected.name.toLowerCase()) &&
    filtered.length > 0;

  return (
    <div className={cn("relative", className)}>
      <Label>{label}</Label>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!e.target.value) onChange("");
        }}
        placeholder="Escribir nombre de tienda..."
        required={required && !value}
        autoComplete="off"
      />
      {showSuggestions ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50"
                onClick={() => {
                  onChange(s.id, s);
                  setQuery(s.name);
                }}
              >
                <span className="font-medium">{s.name}</span>
                {s.code ? (
                  <span className="ml-2 text-xs text-slate-400">{s.code}</span>
                ) : null}
                {s.city ? (
                  <span className="block text-xs text-slate-500">{s.city}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input type="hidden" name="storeId" value={value} />
    </div>
  );
}
