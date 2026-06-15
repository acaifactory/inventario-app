import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { recordPurchaseInvoice } from "@/lib/inventory/purchases";
import { prisma } from "@/lib/prisma";
import {
  mapStoreLocationError,
  resolveLocationId,
} from "@/lib/stores/resolve-transfer-locations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const invoices = await prisma.purchaseInvoice.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      supplier: true,
      lines: { include: { product: true, location: true } },
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const mappedLines = await Promise.all(
      (body.lines ?? []).map(
        async (line: {
          productId: string;
          locationId?: string;
          storeId?: string;
          quantity: number;
          totalPrice: number;
          unit?: string;
          contentsPerUnit?: number;
        }) => ({
          productId: line.productId,
          locationId: await resolveLocationId({
            locationId: line.locationId,
            storeId: line.storeId,
          }),
          quantity: Number(line.quantity),
          totalPrice: Number(line.totalPrice),
          unit: line.unit,
          contentsPerUnit:
            line.contentsPerUnit != null
              ? Number(line.contentsPerUnit)
              : undefined,
        })
      )
    );

    const invoice = await recordPurchaseInvoice({
      invoiceNumber: body.invoiceNumber,
      supplierId: body.supplierId,
      storeId: body.storeId,
      registeredByName: requireRegisteredByName(body.registeredByName),
      userId: session.id,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined,
      lines: mappedLines,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json(
      {
        error:
          message === "INVALID_UNIT"
            ? "Unidad no válida para este producto"
            : message === "MISSING_CONTENTS_PER_UNIT"
              ? "Indica cuánto contiene cada unidad de compra"
              : message === "INVALID_CONTENTS_PER_UNIT"
                ? "La cantidad contenida debe ser mayor que cero"
                : mapStoreLocationError(message),
      },
      { status: 400 }
    );
  }
}
