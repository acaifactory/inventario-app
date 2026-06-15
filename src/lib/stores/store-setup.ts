export const DEFAULT_STORE_LOCATIONS = [
  { name: "Cocina", description: "Prep y línea de bowls" },
  { name: "Freezer", description: "Bases congeladas" },
  { name: "Almacén seco", description: "Toppings, empaques, seco" },
  { name: "Mostrador", description: "Bebidas y empaques frente" },
] as const;

export function suggestStoreCode(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 16);

  return base || "TIENDA";
}

async function uniqueStoreCode(
  preferred: string,
  exists: (code: string) => Promise<boolean>
) {
  let code = preferred;
  let suffix = 1;
  while (await exists(code)) {
    suffix += 1;
    code = `${preferred.slice(0, 12)}-${suffix}`;
  }
  return code;
}

export { uniqueStoreCode };
