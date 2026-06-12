import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const locations = await prisma.location.findMany({
    where: { active: true },
    include: { store: true },
    orderBy: [{ store: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(locations);
}
