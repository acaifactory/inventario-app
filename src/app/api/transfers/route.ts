import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { recordTransfer } from "@/lib/inventory/movements";
import { prisma } from "@/lib/prisma";
import { resolveTransferLocationIds, mapStoreLocationError } from "@/lib/stores/resolve-transfer-locations";
import { mapUnitConversionError } from "@/lib/utils";

export async function GET() {
  const transfers = await prisma.transfer.findMany({
    orderBy: { date: "desc" },
    take: 50,
    include: {
      product: true,
      fromLocation: { include: { store: true } },
      toLocation: { include: { store: true } },
      user: { select: { name: true } },
    },
  });
  return NextResponse.json(transfers);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const { fromLocationId, toLocationId } = await resolveTransferLocationIds({
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      fromStoreId: body.fromStoreId,
      toStoreId: body.toStoreId,
    });

    const transfer = await recordTransfer({
      productId: body.productId,
      fromLocationId,
      toLocationId,
      quantity: Number(body.quantity),
      userId: session.id,
      registeredByName: requireRegisteredByName(body.registeredByName),
      deliveredByName: body.deliveredByName,
      receivedByName: body.receivedByName,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined,
      unit: body.unit,
      contentsPerUnit:
        body.contentsPerUnit != null
          ? Number(body.contentsPerUnit)
          : undefined,
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json(
      {
        error:
          message === "INSUFFICIENT_STOCK"
            ? "Stock insuficiente en origen"
            : message === "SAME_LOCATION" || message === "SAME_STORE"
              ? "Origen y destino deben ser tiendas diferentes"
              : message === "INVALID_UNIT"
                ? mapUnitConversionError(message)
                : mapUnitConversionError(message, mapStoreLocationError(message)),
      },
      { status: 400 }
    );
  }
}