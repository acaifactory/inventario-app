import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const type = new URL(request.url).searchParams.get("type");

  if (type !== "entry" && type !== "exit") {
    return NextResponse.json(
      { error: "Parámetro type debe ser entry o exit" },
      { status: 400 }
    );
  }

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      type: type === "entry" ? "ENTRY" : "EXIT",
      isReversal: false,
      reversedAt: null,
      purchaseLineId: null,
    },
    include: {
      product: true,
      location: { include: { store: true } },
      supplier: true,
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json(movements);
}
