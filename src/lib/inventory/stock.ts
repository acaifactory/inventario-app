import { prisma } from "@/lib/prisma";

export async function getProductStock(productId: string, locationId: string) {
  const stock = await prisma.productStock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  return stock?.quantity ?? 0;
}

export async function getProductTotalStock(productId: string) {
  const stocks = await prisma.productStock.findMany({
    where: { productId },
    select: { quantity: true },
  });
  return stocks.reduce((sum, s) => sum + s.quantity, 0);
}

export async function upsertStock(
  productId: string,
  locationId: string,
  delta: number
) {
  const existing = await prisma.productStock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });

  const newQty = (existing?.quantity ?? 0) + delta;
  if (newQty < 0) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  return prisma.productStock.upsert({
    where: { productId_locationId: { productId, locationId } },
    create: { productId, locationId, quantity: Math.max(0, delta) },
    update: { quantity: newQty },
  });
}

export async function setStock(
  productId: string,
  locationId: string,
  quantity: number
) {
  if (quantity < 0) throw new Error("INVALID_QUANTITY");

  return prisma.productStock.upsert({
    where: { productId_locationId: { productId, locationId } },
    create: { productId, locationId, quantity },
    update: { quantity },
  });
}

export async function getStockByLocation(locationId?: string) {
  return prisma.productStock.findMany({
    where: locationId ? { locationId } : undefined,
    include: {
      product: { include: { category: true, supplier: true } },
      location: true,
    },
    orderBy: { product: { name: "asc" } },
  });
}
