import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { updateTransfer } from "@/lib/inventory/movements";
import { prisma } from "@/lib/prisma";
import {
  mapStoreLocationError,
  resolveTransferLocationIds,
} from "@/lib/stores/resolve-transfer-locations";
import { mapUnitConversionError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

const include = {
  product: true,
  fromLocation: { include: { store: true } },
  toLocation: { include: { store: true } },
  user: { select: { name: true } },
} as const;

function mapEditError(message: string) {
  if (message === "INSUFFICIENT_STOCK_FOR_EDIT") {
    return "No se puede editar: el stock actual no permite revertir esta transferencia";
  }
  if (message === "SAME_LOCATION" || message === "SAME_STORE") {
    return "Origen y destino deben ser tiendas diferentes";
  }
  return mapUnitConversionError(message, mapStoreLocationError(message));
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const transfer = await prisma.transfer.findUnique({
    where: { id },
    include,
  });

  if (!transfer) {
    return NextResponse.json(
      { error: "Transferencia no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(transfer);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();

    const { fromLocationId, toLocationId } = await resolveTransferLocationIds({
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      fromStoreId: body.fromStoreId,
      toStoreId: body.toStoreId,
    });

    const transfer = await updateTransfer(id, {
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

    const full = await prisma.transfer.findUniqueOrThrow({
      where: { id: transfer.id },
      include,
    });

    return NextResponse.json(full);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: mapEditError(message) }, { status: 400 });
  }
}
