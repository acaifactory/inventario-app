import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UNITS } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("es-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy", { locale: es });
}

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale: es });
}

export function mapUnitConversionError(message: string, fallback?: string) {
  if (message === "MISSING_CONTENTS_PER_UNIT") {
    return "Indica cuánto contiene cada unidad recibida";
  }
  if (message === "INVALID_CONTENTS_PER_UNIT") {
    return "La cantidad contenida debe ser mayor que cero";
  }
  if (message === "INVALID_UNIT") {
    return "Unidad no válida para este producto";
  }
  return fallback ?? message;
}

export function getUnitLabel(unit: string) {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}

export function formatQtyWithUnit(qty: number, unit: string, decimals = 1) {
  return `${formatNumber(qty, decimals)} ${getUnitLabel(unit)}`;
}

export function formatRegisteredQuantity(input: {
  quantity: number;
  registeredQuantity?: number | null;
  registeredUnit?: string | null;
  fallbackUnit?: string;
}) {
  if (input.registeredQuantity != null && input.registeredUnit) {
    return formatQtyWithUnit(input.registeredQuantity, input.registeredUnit);
  }
  return formatQtyWithUnit(input.quantity, input.fallbackUnit ?? "UNIT");
}

export function loanPendingInRegisteredUnit(loan: {
  quantity: number;
  quantityReturned: number;
  registeredQuantity: number | null;
  registeredUnit: string | null;
}) {
  const pendingBase = loan.quantity - loan.quantityReturned;
  if (
    loan.registeredQuantity &&
    loan.registeredUnit &&
    loan.registeredQuantity > 0
  ) {
    const factor = loan.quantity / loan.registeredQuantity;
    return pendingBase / factor;
  }
  return pendingBase;
}

export function fullCostIndicator(
  actual: number,
  target: number,
  tolerance = 1.5
): "green" | "yellow" | "red" {
  if (actual <= target) return "green";
  if (actual <= target + tolerance) return "yellow";
  return "red";
}
