"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { getUnitLabel } from "@/lib/utils";

export type UnitOption = {
  unit: string;
  label: string;
  conversionFactor?: number;
};

type Props = {
  quantity: string;
  unit: string;
  units: UnitOption[];
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  required?: boolean;
  quantityLabel?: string;
};

export function UnitQuantityInput({
  quantity,
  unit,
  units,
  onQuantityChange,
  onUnitChange,
  required,
  quantityLabel = "Cantidad",
}: Props) {
  const selected = units.find((u) => u.unit === unit);

  return (
    <div className="space-y-1 sm:col-span-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{quantityLabel}</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            required={required}
          />
        </div>
        <div>
          <Label>Unidad de medida</Label>
          <Select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            required={required}
            disabled={units.length === 0}
          >
            {units.length === 0 ? (
              <option value="">Seleccione producto</option>
            ) : (
              units.map((u) => (
                <option key={u.unit} value={u.unit}>
                  {u.label}
                  {u.conversionFactor && u.conversionFactor !== 1
                    ? ` (×${u.conversionFactor})`
                    : ""}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>
      {selected?.conversionFactor && selected.conversionFactor !== 1 ? (
        <p className="text-xs text-slate-500">
          1 {selected.label} = {selected.conversionFactor} unidad(es) base de
          inventario
        </p>
      ) : unit ? (
        <p className="text-xs text-slate-500">
          Inventario en: {getUnitLabel(unit)}
        </p>
      ) : null}
    </div>
  );
}
