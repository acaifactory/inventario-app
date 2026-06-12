import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  findDuplicateProductGroups,
  mergeProducts,
  normalizeAllProductNames,
} from "@/lib/products/normalize";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const duplicates = await findDuplicateProductGroups();
  return NextResponse.json({ duplicates });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === "normalize") {
    const updated = await normalizeAllProductNames();
    return NextResponse.json({ updated });
  }

  if (action === "merge" && body.masterId && Array.isArray(body.duplicateIds)) {
    const master = await mergeProducts(body.masterId, body.duplicateIds);
    return NextResponse.json({ master });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
