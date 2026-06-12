import type { Prisma } from "@prisma/client";

export async function getLocationStock(
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string
) {
  const stock = await tx.productStock.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });
  return stock?.quantity ?? 0;
}
