type LocationLike = {
  id: string;
  name: string;
  active?: boolean;
};

export function pickDefaultStoreLocation(locations: LocationLike[]) {
  const active = locations.filter((l) => l.active !== false);
  const list = active.length ? active : locations;
  const preferred = list.find((l) =>
    /almac[eé]n|principal|general|inventario/i.test(l.name)
  );
  return preferred ?? list[0] ?? null;
}

export function storeLocationLabel(
  location: { name: string; store?: { name: string } | null } | null
) {
  if (!location) return "—";
  return location.store?.name ?? location.name;
}
