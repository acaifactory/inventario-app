import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { recordEntry } from "@/lib/inventory/movements";
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

    const movement = await recordEntry({
      productId: body.productId,
      locationId,
      quantity: Number(body.quantity),
      unitCost: Number(body.unitCost),
      userId: session.id,
      registeredByName: requireRegisteredByName(body.registeredByName),
      supplierId: body.supplierId,
      invoiceNumber: body.invoiceNumber,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined,
      unit: body.unit,
      lineTotal: body.lineTotal != null ? Number(body.lineTotal) : undefined,
      contentsPerUnit:
        body.contentsPerUnit != null
          ? Number(body.contentsPerUnit)
          : undefined,
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "UNAUTHORIZED" ? 401 : 400;
    return NextResponse.json(
      {
        error: mapUnitConversionError(message, mapStoreLocationError(message)),
      },
      { status }
    );
  }
}
