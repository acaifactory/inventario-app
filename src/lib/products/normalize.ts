import { prisma } from "@/lib/prisma";

/** Normaliza nombre: Title Case consistente */
export function normalizeProductName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (/^\d/.test(word) || word.includes("oz") || word.includes("OZ")) {
        return word;
      }
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function productDedupeKey(name: string): string {
  return normalizeProductName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export async function findDuplicateProductGroups() {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { stocks: true },
  });

  const groups = new Map<string, typeof products>();

  for (const p of products) {
    const key = productDedupeKey(p.name);
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      canonical: normalizeProductName(items[0].name),
      items: items.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stocks.reduce((s, x) => s + x.quantity, 0),
      })),
    }));
}

export async function mergeProducts(masterId: string, duplicateIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const master = await tx.product.findUniqueOrThrow({ where: { id: masterId } });

    for (const dupId of duplicateIds) {
      if (dupId === masterId) continue;

      const dupStocks = await tx.productStock.findMany({
        where: { productId: dupId },
      });

      for (const stock of dupStocks) {
        const existing = await tx.productStock.findUnique({
          where: {
            productId_locationId: {
              productId: masterId,
              locationId: stock.locationId,
            },
          },
        });
        if (existing) {
          await tx.productStock.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + stock.quantity },
          });
        } else {
          await tx.productStock.create({
            data: {
              productId: masterId,
              locationId: stock.locationId,
              quantity: stock.quantity,
            },
          });
        }
      }

      await tx.inventoryMovement.updateMany({
        where: { productId: dupId },
        data: { productId: masterId },
      });

      await tx.product.update({
        where: { id: dupId },
        data: {
          active: false,
          notes: `Fusionado en ${master.name}`,
        },
      });
    }

    await tx.product.update({
      where: { id: masterId },
      data: { name: normalizeProductName(master.name) },
    });

    return master;
  });
}

export async function normalizeAllProductNames() {
  const products = await prisma.product.findMany({ where: { active: true } });
  let updated = 0;
  for (const p of products) {
    const normalized = normalizeProductName(p.name);
    if (normalized !== p.name) {
      await prisma.product.update({
        where: { id: p.id },
        data: { name: normalized },
      });
      updated++;
    }
  }
  return updated;
}
