import { prisma } from "@/lib/prisma";
import { pickDefaultStoreLocation } from "./default-location";

export function mapStoreLocationError(message: string) {
  switch (message) {
    case "STORE_NOT_FOUND":
      return "Tienda no encontrada";
    case "STORE_WITHOUT_LOCATION":
      return "La tienda no tiene localidad de inventario configurada";
    case "MISSING_LOCATION":
      return "Selecciona una tienda";
    default:
      return message;
  }
}

export async function resolveStoreToLocationId(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId, active: true },
    include: { locations: { where: { active: true }, orderBy: { name: "asc" } } },
  });

  if (!store) throw new Error("STORE_NOT_FOUND");

  const location = pickDefaultStoreLocation(store.locations);
  if (!location) throw new Error("STORE_WITHOUT_LOCATION");

  return location.id;
}

export async function resolveLocationId(input: {
  locationId?: string;
  storeId?: string;
}) {
  if (input.locationId) return input.locationId;
  if (input.storeId) return resolveStoreToLocationId(input.storeId);
  throw new Error("MISSING_LOCATION");
}

export async function resolveTransferLocationIds(input: {
  fromLocationId?: string;
  toLocationId?: string;
  fromStoreId?: string;
  toStoreId?: string;
}) {
  const fromLocationId =
    input.fromLocationId ??
    (input.fromStoreId
      ? await resolveStoreToLocationId(input.fromStoreId)
      : undefined);
  const toLocationId =
    input.toLocationId ??
    (input.toStoreId
      ? await resolveStoreToLocationId(input.toStoreId)
      : undefined);

  if (!fromLocationId || !toLocationId) {
    throw new Error("MISSING_LOCATION");
  }

  if (input.fromStoreId && input.toStoreId && input.fromStoreId === input.toStoreId) {
    throw new Error("SAME_STORE");
  }

  return { fromLocationId, toLocationId };
}
