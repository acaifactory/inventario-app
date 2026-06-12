import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { createLoan } from "@/lib/inventory/loans";
import { prisma } from "@/lib/prisma";
import {
  mapStoreLocationError,
  resolveLocationId,
} from "@/lib/stores/resolve-transfer-locations";

export async function GET(request: NextRequest) {
  const direction = new URL(request.url).searchParams.get("direction");

  const loans = await prisma.loan.findMany({
    where: direction ? { direction: direction as "OUT" | "IN" } : undefined,
    include: {
      product: true,
      location: { include: { store: true } },
      returns: true,
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json(loans);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const locationId = await resolveLocationId({
      locationId: body.locationId,
      storeId: body.storeId,
    });

    const loan = await createLoan({
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
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json(
      {
        error:
          message === "INSUFFICIENT_STOCK"
            ? "Stock insuficiente"
            : message === "INVALID_UNIT"
              ? "Unidad no válida para este producto"
              : mapStoreLocationError(message),
      },
      { status: 400 }
    );
  }
}
