import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import {
  calculateFinancialPeriod,
  createFinancialPeriod,
  endOfDay,
  startOfDay,
} from "@/lib/inventory/financial-analysis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseDateField(value: unknown, mode: "start" | "end") {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("DATES_REQUIRED");
  }
  const parts = value.trim().slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error("INVALID_DATE");
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return mode === "start" ? startOfDay(date) : endOfDay(date);
}

function mapFinancialError(message: string) {
  switch (message) {
    case "REGISTERED_BY_REQUIRED":
      return "Indica quién es el responsable del análisis.";
    case "DATES_REQUIRED":
      return "Selecciona fecha inicial y final.";
    case "INVALID_DATE":
      return "Las fechas no son válidas.";
    case "UNAUTHORIZED":
      return "Sesión expirada. Vuelve a iniciar sesión.";
    default:
      return message;
  }
}

export async function GET() {
  try {
    await requireSession();
    const periods = await prisma.financialPeriod.findMany({
      orderBy: { endDate: "desc" },
      take: 50,
      include: { store: true, user: { select: { name: true } } },
    });
    return NextResponse.json(periods);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: mapFinancialError(message) }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const isPreview = Boolean(body.preview);

    const startDate = parseDateField(body.startDate, "start");
    const endDate = parseDateField(body.endDate, "end");

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "La fecha final debe ser posterior a la inicial." },
        { status: 400 }
      );
    }

    const totalSales = Number(body.totalSales);
    if (!Number.isFinite(totalSales) || totalSales < 0) {
      return NextResponse.json(
        { error: "Indica las ventas totales del período (número ≥ 0)." },
        { status: 400 }
      );
    }

    const targetFullCostPercent = Number(body.targetFullCostPercent);
    if (
      !Number.isFinite(targetFullCostPercent) ||
      targetFullCostPercent < 0
    ) {
      return NextResponse.json(
        { error: "Indica un Full Cost objetivo válido." },
        { status: 400 }
      );
    }

    const input = {
      startDate,
      endDate,
      totalSales,
      targetFullCostPercent,
      responsibleName: isPreview
        ? typeof body.responsibleName === "string"
          ? body.responsibleName.trim() || "Vista previa"
          : "Vista previa"
        : requireRegisteredByName(body.responsibleName),
      userId: session.id,
      storeId: body.storeId,
    };

    if (isPreview) {
      const metrics = await calculateFinancialPeriod(input);
      return NextResponse.json(metrics);
    }

    const period = await createFinancialPeriod(input);
    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error("[financial-periods]", error);
    const message = error instanceof Error ? error.message : "Error";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "REGISTERED_BY_REQUIRED" ||
            message === "DATES_REQUIRED" ||
            message === "INVALID_DATE"
          ? 400
          : 500;
    return NextResponse.json({ error: mapFinancialError(message) }, { status });
  }
}
