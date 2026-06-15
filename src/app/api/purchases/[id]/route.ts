import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { updatePurchaseInvoice, type PurchaseLineInput } from "@/lib/inventory/purchases";
import { revalidateInventoryViews } from "@/lib/inventory/revalidate-views";
import { prisma } from "@/lib/prisma";
import {
  mapStoreLocationError,
  resolveLocationId,
} from "@/lib/stores/resolve-transfer-locations";

type RouteParams = { params: Promise<{ id: string }> };

const invoiceInclude = {
  supplier: true,
  store: true,
  lines: {
    include: {
      product: true,
      location: { include: { store: true } },
    },
  },
} as const;

function mapPurchaseError(message: string) {
  if (message === "INVALID_UNIT") return "Unidad no válida para este producto";
  if (message === "MISSING_CONTENTS_PER_UNIT") {
    return "Indica cuánto contiene cada unidad de compra";
  }
  if (message === "INVALID_CONTENTS_PER_UNIT") {
    return "La cantidad contenida debe ser mayor que cero";
  }
  if (message === "INSUFFICIENT_STOCK_FOR_EDIT") {
    return "No se puede editar: ya se usó parte de esta compra y no hay stock suficiente para revertir";
  }
  return mapStoreLocationError(message);
}

async function mapBodyLines(
  body: {
    lines?: {
      productId: string;
      locationId?: string;
      storeId?: string;
      quantity: number;
      totalPrice: number;
      unit?: string;
      contentsPerUnit?: number;
    }[];
  }
) {
  return Promise.all(
    (body.lines ?? []).map(async (line) => ({
      productId: line.productId,
      locationId: await resolveLocationId({
        locationId: line.locationId,
        storeId: line.storeId,
      }),
      quantity: Number(line.quantity),
      totalPrice: Number(line.totalPrice),
      unit: line.unit as PurchaseLineInput["unit"],
      contentsPerUnit:
        line.contentsPerUnit != null
          ? Number(line.contentsPerUnit)
          : undefined,
    }))
  );
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: invoiceInclude,
  });

  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();

    const invoice = await updatePurchaseInvoice(id, {
      invoiceNumber: body.invoiceNumber,
      supplierId: body.supplierId,
      storeId: body.storeId,
      registeredByName: requireRegisteredByName(body.registeredByName),
      userId: session.id,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined,
      lines: await mapBodyLines(body),
    });

    revalidateInventoryViews();
    return NextResponse.json(invoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: mapPurchaseError(message) }, { status: 400 });
  }
}
