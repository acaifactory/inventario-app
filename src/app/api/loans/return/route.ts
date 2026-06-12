import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import { returnLoan } from "@/lib/inventory/loans";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const loan = await returnLoan({
      loanId: body.loanId,
      quantity: Number(body.quantity),
      registeredByName: requireRegisteredByName(body.registeredByName),
      userId: session.id,
      notes: body.notes,
      date: body.date ? new Date(body.date) : undefined,
      unit: body.unit,
    });

    return NextResponse.json(loan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json(
      {
        error:
          message === "EXCEEDS_PENDING"
            ? "Cantidad excede lo pendiente por devolver"
            : message === "INSUFFICIENT_STOCK"
              ? "Stock insuficiente"
              : message === "INVALID_UNIT"
                ? "Unidad no válida para este producto"
                : message,
      },
      { status: 400 }
    );
  }
}
