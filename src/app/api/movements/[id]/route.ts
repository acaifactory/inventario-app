import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { updateInventoryMovement } from "@/lib/inventory/movements";
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
  supplier: true,
} as const;

function mapEditError(message: string) {
  if (message === "INSUFFICIENT_STOCK_FOR_EDIT") {
    return "No se puede editar: el stock actual no permite revertir este movimiento";
  }
  if (message === "LOAN_HAS_RETURNS") {
    return "No se puede editar un préstamo con devoluciones registradas";
  }
  if (message === "CANNOT_EDIT_PURCHASE") {
    return "Edita esta entrada desde Compras → Facturas";
  }
  if (message === "ALREADY_REVERSED" || message === "CANNOT_EDIT") {
    return "Este registro no se puede editar";
  }
  return mapUnitConversionError(message, mapStoreLocationError(message));
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const movement = await prisma.inventoryMovement.findUnique({
    where: { id },
    include,
  });

  if (!movement) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  return NextResponse.json(movement);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const kind = body.kind as "entry" | "exit";

    if (kind !== "entry" && kind !== "exit") {
      return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
    }

    const locationId = await resolveLocationId({
      locationId: body.locationId,
      storeId: body.storeId,
    });

    const registeredByName = requireRegisteredByName(body.registeredByName);

    const movement =
      kind === "entry"
        ? await updateInventoryMovement(id, "entry", {
            productId: body.productId,
            locationId,
            quantity: Number(body.quantity),
            unitCost: Number(body.unitCost),
            userId: session.id,
            registeredByName,
            supplierId: body.supplierId || undefined,
            invoiceNumber: body.invoiceNumber || undefined,
            notes: body.notes,
            date: body.date ? new Date(body.date) : undefined,
            unit: body.unit,
            lineTotal:
              body.lineTotal != null ? Number(body.lineTotal) : undefined,
            contentsPerUnit:
              body.contentsPerUnit != null
                ? Number(body.contentsPerUnit)
                : undefined,
          })
        : await updateInventoryMovement(id, "exit", {
            productId: body.productId,
            locationId,
            quantity: Number(body.quantity),
            exitReason: body.exitReason,
            userId: session.id,
            registeredByName,
            notes: body.notes,
            date: body.date ? new Date(body.date) : undefined,
            unit: body.unit,
            contentsPerUnit:
              body.contentsPerUnit != null
                ? Number(body.contentsPerUnit)
                : undefined,
          });

    const full = await prisma.inventoryMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include,
    });

    return NextResponse.json(full);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: mapEditError(message) }, { status: 400 });
  }
}
