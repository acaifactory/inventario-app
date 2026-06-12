import { prisma } from "@/lib/prisma";
import { storeLocationLabel } from "@/lib/stores/default-location";

export type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export async function globalSearch(query: string, limit = 8): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [products, invoices, suppliers, transfers, movements, locations, stores] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        },
        take: limit,
        include: { category: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: { invoiceNumber: { contains: q, mode: "insensitive" } },
        take: limit,
        include: { supplier: true },
      }),
      prisma.supplier.findMany({
        where: {
          active: true,
          name: { contains: q, mode: "insensitive" },
        },
        take: limit,
      }),
      prisma.transfer.findMany({
        where: { product: { name: { contains: q, mode: "insensitive" } } },
        take: limit,
        include: {
          product: true,
          fromLocation: { include: { store: true } },
          toLocation: { include: { store: true } },
        },
      }),
      prisma.inventoryMovement.findMany({
        where: {
          OR: [
            { product: { name: { contains: q, mode: "insensitive" } } },
            { registeredByName: { contains: q, mode: "insensitive" } },
          ],
        },
        take: limit,
        include: { product: true },
        orderBy: { date: "desc" },
      }),
      prisma.location.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: limit,
        include: { store: true },
      }),
      prisma.store.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        take: limit,
      }),
    ]);

  const results: SearchResult[] = [];

  for (const p of products) {
    results.push({
      type: "Producto",
      id: p.id,
      title: p.name,
      subtitle: p.sku ? `SKU ${p.sku} · ${p.category.name}` : p.category.name,
      href: `/products?q=${encodeURIComponent(p.name)}`,
    });
  }
  for (const inv of invoices) {
    results.push({
      type: "Factura",
      id: inv.id,
      title: inv.invoiceNumber,
      subtitle: inv.supplier.name,
      href: "/purchases",
    });
  }
  for (const s of suppliers) {
    results.push({
      type: "Proveedor",
      id: s.id,
      title: s.name,
      href: "/purchases/suppliers",
    });
  }
  for (const t of transfers) {
    results.push({
      type: "Transferencia",
      id: t.id,
      title: t.product.name,
      subtitle: `${storeLocationLabel(t.fromLocation)} → ${storeLocationLabel(t.toLocation)}`,
      href: "/movements?tab=transfer",
    });
  }
  for (const m of movements) {
    results.push({
      type: "Movimiento",
      id: m.id,
      title: m.product.name,
      subtitle: `${m.type} · ${m.registeredByName}`,
      href: "/audit",
    });
  }
  for (const l of locations) {
    results.push({
      type: "Localidad",
      id: l.id,
      title: l.name,
      subtitle: l.store?.name ?? undefined,
      href: "/settings/locations",
    });
  }
  for (const s of stores) {
    results.push({
      type: "Tienda",
      id: s.id,
      title: s.name,
      subtitle: s.code,
      href: "/settings/stores",
    });
  }

  return results.slice(0, limit * 2);
}
