import { NextRequest, NextResponse } from "next/server";
import { requireSession, canManageCatalog } from "@/lib/auth";
import { createWeeklySnapshot } from "@/lib/inventory/snapshots";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const snapshots = await prisma.weeklySnapshot.findMany({
    orderBy: { weekStart: "desc" },
    take: 52,
    include: { store: true },
  });
  return NextResponse.json(snapshots);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const snapshot = await createWeeklySnapshot(
      body.storeId,
      Number(body.totalSales ?? 0),
      Number(body.targetFullCostPercent ?? 30)
    );

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
