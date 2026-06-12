import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickDefaultStoreLocation } from "@/lib/stores/default-location";

export async function GET() {
  const stores = await prisma.store.findMany({
    where: { active: true },
    include: {
      locations: { where: { active: true }, orderBy: { name: "asc" } },
      _count: { select: { locations: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    stores.map((store) => ({
      id: store.id,
      name: store.name,
      code: store.code,
      type: store.type,
      city: store.city,
      address: store.address,
      locationCount: store._count.locations,
      defaultLocationId: pickDefaultStoreLocation(store.locations)?.id ?? null,
    }))
  );
}
