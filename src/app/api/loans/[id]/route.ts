import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { updateLoan } from "@/lib/inventory/loans";
import { revalidateInventoryViews } from "@/lib/inventory/revalidate-views";
import { prisma } from "@/lib/prisma";
import {
  mapStoreLocationError,
  resolveLocationId,
} from "@/lib/stores/resolve-transfer-locations";
import { mapUnitConversionError } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

const include = {
  product: true,
  location: { include: { store: true } },
  returns: true,
  user: { select: { name: true } },
} as const;

function mapEditError(message: string) {
  if (message === "INSUFFICIENT_STOCK_FOR_EDIT") {
    return "No se puede editar: el stock actual no permite revertir este préstamo";
  }
  if (message === "LOAN_HAS_RETURNS") {
    return "No se puede editar un préstamo con devoluciones registradas";
  }
  return mapUnitConversionError(message, mapStoreLocationError(message));
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const loan = await prisma.loan.findUnique({
    where: { id },
    include,
  });

  if (!loan) {
    return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
  }

  return NextResponse.json(loan);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();

    const locationId = await resolveLocationId({
      locationId: body.locationId,
      storeId: body.storeId,
    });

    const loan = await updateLoan(id, {
      direction: body.direction,
      productId: body.productId,
      locationId,
      quantity: Number(body.quantity),
      counterpartyName: body.counterpartyName,
      responsibleName: body.responsibleName,
      registeredByName: requireRegisteredByName(body.registeredByName),
      userId: session.id,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined,
      unit: body.unit,
      contentsPerUnit:
        body.contentsPerUnit != null
          ? Number(body.contentsPerUnit)
          : undefined,
    });

    const full = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include,
    });

    revalidateInventoryViews();
    return NextResponse.json(full);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: mapEditError(message) }, { status: 400 });
  }
}
