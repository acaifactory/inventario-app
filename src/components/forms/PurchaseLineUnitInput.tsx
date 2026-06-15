"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { formatCurrency, formatNumber, getUnitLabel } from "@/lib/utils";
import type { ProductOption } from "@/components/ui/ProductSearch";
import {
  getPurchaseUnitOptionsForProduct,
  purchaseUnitNeedsConversion,
  type PurchaseUnitOption,
} from "@/lib/product-units-ui";

type Props = {
  product?: ProductOption;
  quantity: string;
  unit: string;
  contentsPerUnit: string;
  totalPrice: string;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onContentsPerUnitChange: (value: string) => void;
  required?: boolean;
};

function unitLabelFor(
  options: PurchaseUnitOption[],
  unit: string
): string {
  return options.find((o) => o.unit === unit)?.label ?? getUnitLabel(unit);
}

export function PurchaseLineUnitInput({
  product,
  quantity,
  unit,
  contentsPerUnit,
  totalPrice,
  onQuantityChange,
  onUnitChange,
  onContentsPerUnitChange,
  required,
}: Props) {
  const unitOptions = getPurchaseUnitOptionsForProduct(product);
  const baseUnit = product?.unit ?? "UNIT";
  const needsConversion = purchaseUnitNeedsConversion(product, unit);
  const qty = Number(quantity || 0);
  const contents = Number(contentsPerUnit || 0);
  const total = Number(totalPrice || 0);
  const purchaseLabel = unitLabelFor(unitOptions, unit);
  const baseLabel = getUnitLabel(baseUnit);

  const baseQty =
    needsConversion && contents > 0
      ? qty * contents
      : !needsConversion && qty > 0
        ? qty
        : 0;
  const baseUnitCost = baseQty > 0 && total > 0 ? total / baseQty : null;

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Cantidad comprada</Label>
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
          <Label>Unidad recibida</Label>
          <Select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            required={required}
            disabled={!product}
          >
            {!product ? (
              <option value="">Seleccione producto</option>
            ) : (
              unitOptions.map((u) => (
                <option key={u.unit} value={u.unit}>
                  {u.label}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      {needsConversion ? (
        <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
          <Label>
            ¿Cuánto contiene esta unidad? ({purchaseLabel})
          </Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Esta {purchaseLabel.toLowerCase()} contiene</span>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              className="w-28"
              value={contentsPerUnit}
              onChange={(e) => onContentsPerUnitChange(e.target.value)}
              required={required}
              placeholder="Ej. 20"
            />
            <span className="rounded-md bg-white px-2 py-1 text-sm font-medium text-violet-800">
              {baseLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            El sistema convertirá esta compra a la unidad base del producto (
            {baseLabel}) para calcular inventario y costo.
          </p>
        </div>
      ) : product ? (
        <p className="text-xs text-slate-500">
          Unidad base del producto ({baseLabel}): conversión 1:1, sin factor
          adicional.
        </p>
      ) : null}

      {baseQty > 0 && total > 0 ? (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {needsConversion && contents > 0 ? (
            <p>
              {formatNumber(qty, 2)} {purchaseLabel} × {formatNumber(contents, 2)}{" "}
              {baseLabel} ={" "}
              <strong>
                {formatNumber(baseQty, 2)} {baseLabel}
              </strong>{" "}
              al inventario
            </p>
          ) : (
            <p>
              Inventario:{" "}
              <strong>
                {formatNumber(baseQty, 2)} {baseLabel}
              </strong>
            </p>
          )}
          {baseUnitCost != null ? (
            <p className="mt-1 text-violet-700">
              Costo por {baseLabel}: {formatCurrency(baseUnitCost)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
