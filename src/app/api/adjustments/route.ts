import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { recordAdjustment } from "@/lib/inventory/movements";
import { revalidateInventoryViews } from "@/lib/inventory/revalidate-views";
import { prisma } from "@/lib/prisma";
import {
  mapStoreLocationError,
  resolveLocationId,
} from "@/lib/stores/resolve-transfer-locations";
import { mapUnitConversionError } from "@/lib/utils";

export async function GET() {
  const adjustments = await prisma.inventoryAdjustment.findMany({
    orderBy: { date: "desc" },
    take: 50,
    include: {
      product: true,
      location: { include: { store: true } },
      user: { select: { name: true } },
    },
  });
  return NextResponse.json(adjustments);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const locationId = await resolveLocationId({
      locationId: body.locationId,
      storeId: body.storeId,
    });

    const adjustment = await recordAdjustment({
      productId: body.productId,
      locationId,
      countedQuantity: Number(body.countedQuantity),
      unit: body.unit,
      contentsPerUnit:
        body.contentsPerUnit != null
          ? Number(body.contentsPerUnit)
          : undefined,
      reason: body.reason,
      userId: session.id,
      registeredByName: requireRegisteredByName(body.registeredByName),
      notes: body.notes,
      physicalCountId: body.physicalCountId,
      date: body.date ? new Date(body.date) : undefined,
    });

    revalidateInventoryViews();
    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json(
      {
        error: mapUnitConversionError(message, mapStoreLocationError(message)),
      },
      { status: 400 }
    );
  }
}
