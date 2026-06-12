import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { requireRegisteredByName } from "@/lib/inventory/audit";
import {
  calculateFinancialPeriod,
  createFinancialPeriod,
} from "@/lib/inventory/financial-analysis";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const periods = await prisma.financialPeriod.findMany({
    orderBy: { endDate: "desc" },
    take: 50,
    include: { store: true, user: { select: { name: true } } },
  });
  return NextResponse.json(periods);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const input = {
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      totalSales: Number(body.totalSales),
      targetFullCostPercent: Number(body.targetFullCostPercent),
      responsibleName: requireRegisteredByName(body.responsibleName),
      userId: session.id,
      storeId: body.storeId,
    };

    if (body.preview) {
      const metrics = await calculateFinancialPeriod(input);
      return NextResponse.json(metrics);
    }

    const period = await createFinancialPeriod(input);
    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
