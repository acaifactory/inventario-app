import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { recordExit } from "@/lib/inventory/movements";
import { revalidateInventoryViews } from "@/lib/inventory/revalidate-views";
import {
  mapStoreLocationError,
  resolveLocationId,
} from "@/lib/stores/resolve-transfer-locations";
import { mapUnitConversionError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const locationId = await resolveLocationId({
      locationId: body.locationId,
      storeId: body.storeId,
    });

    const movement = await recordExit({
      productId: body.productId,
      locationId,
      quantity: Number(body.quantity),
      exitReason: body.exitReason,
      userId: session.id,
      registeredByName: requireRegisteredByName(body.registeredByName),
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined,
      unit: body.unit,
      contentsPerUnit:
        body.contentsPerUnit != null
          ? Number(body.contentsPerUnit)
          : undefined,
    });

    revalidateInventoryViews();
    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "INSUFFICIENT_STOCK"
          ? 400
          : 400;
    return NextResponse.json(
      {
        error:
          message === "INSUFFICIENT_STOCK"
            ? "Stock insuficiente"
            : mapUnitConversionError(message, mapStoreLocationError(message)),
      },
      { status }
    );
  }
}
