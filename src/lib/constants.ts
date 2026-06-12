export const CATEGORIES = [

  { name: "Bases y sorbetes", slug: "bases-sorbetes" },

  { name: "Frutas", slug: "frutas" },

  { name: "Toppings", slug: "toppings" },

  { name: "Salsas y cremas", slug: "salsas-cremas" },

  { name: "Lácteos y bebidas", slug: "lacteos-bebidas" },

  { name: "Café y chocolate", slug: "cafe-chocolate" },

  { name: "Snacks y dulces", slug: "snacks" },

  { name: "Empaques", slug: "empaques" },

  { name: "Limpieza", slug: "limpieza" },

  { name: "Operativos", slug: "operativos" },

] as const;



export const FINANCIAL_CLASSIFICATIONS = [

  {

    value: "FOOD_COST",

    label: "Food Cost",

    includeInFoodCost: true,

    inCogs: true,

  },

  {

    value: "PACKAGING_COST",

    label: "Packaging Cost",

    includeInFoodCost: true,

    inCogs: true,

  },

  {

    value: "CLEANING_SUPPLIES",

    label: "Cleaning Supplies",

    includeInFoodCost: false,

    inCogs: false,

  },

  {

    value: "OPERATING_SUPPLIES",

    label: "Operating Supplies",

    includeInFoodCost: false,

    inCogs: false,

  },

  {

    value: "OTHER",

    label: "Other",

    includeInFoodCost: false,

    inCogs: false,

  },

] as const;



export function financialClassificationLabel(value: string) {

  return (

    FINANCIAL_CLASSIFICATIONS.find((c) => c.value === value)?.label ?? value

  );

}



export const UNITS = [

  { value: "UNIT", label: "Unidad" },

  { value: "LB", label: "Libra (lb)" },

  { value: "OZ", label: "Onza (oz)" },

  { value: "GALLON", label: "Galón" },

  { value: "BOX", label: "Caja (Box)" },

  { value: "CASE", label: "Case / Caja master" },

  { value: "BROKEN_CASE", label: "Broken Case Package (BCP)" },

  { value: "PACK", label: "Paquete" },

  { value: "BAG", label: "Bolsa" },

  { value: "JAR", label: "Pote" },

  { value: "ROLL", label: "Rollo" },

  { value: "OTHER", label: "Otro" },

] as const;



export const EXIT_REASONS = [

  { value: "SALE", label: "Venta" },

  { value: "WASTE", label: "Desperdicio" },

  { value: "DAMAGE", label: "Daño" },

  { value: "EXPIRED", label: "Vencimiento" },

  { value: "TRANSFER", label: "Transferencia" },

  { value: "ADJUSTMENT", label: "Ajuste" },

  { value: "INTERNAL_USE", label: "Uso interno" },

] as const;



export const ROLES = [

  { value: "ADMIN", label: "Administrador" },

  { value: "MANAGER", label: "Manager" },

  { value: "EMPLOYEE", label: "Empleado" },

] as const;



export const STORE_TYPES = [

  { value: "OWNED", label: "Propia" },

  { value: "FRANCHISE", label: "Franquicia" },

] as const;



export const LOAN_STATUS_LABELS = {
  PENDING: "Pendiente",
  PARTIAL_RETURN: "Devuelto parcial",
  COMPLETE_RETURN: "Devuelto completo",
} as const;

export const EXPIRY_WARNING_DAYS = 7;

/** Columnas estándar de la hoja de conteo físico (multi-UOM). */
export const PHYSICAL_COUNT_COLUMNS = [
  { unit: "LB", label: "Libras", short: "Lb" },
  { unit: "CASE", label: "Manga", short: "Manga" },
  { unit: "UNIT", label: "Each", short: "Ea" },
  { unit: "BROKEN_CASE", label: "Broken box", short: "BCP" },
  { unit: "BOX", label: "Box", short: "Box" },
] as const;

export type PhysicalCountUnit =
  (typeof PHYSICAL_COUNT_COLUMNS)[number]["unit"];

