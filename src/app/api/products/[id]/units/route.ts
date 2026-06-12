import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManageCatalog } from "@/lib/auth";
import type { UnitOfMeasure } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id: productId } = await params;
    const body = await request.json();
    const unit = body.unit as UnitOfMeasure;
    const conversionFactor = Number(body.conversionFactor);
    const label = (body.label as string)?.trim() || null;

    if (!unit || !conversionFactor || conversionFactor <= 0) {
      return NextResponse.json(
        { error: "Unidad y factor de conversión (>0) son obligatorios" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const row = await prisma.productUnit.upsert({
      where: { productId_unit: { productId, unit } },
      create: { productId, unit, conversionFactor, label },
      update: { conversionFactor, label },
    });

    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id: productId } = await params;
    const unit = request.nextUrl.searchParams.get("unit") as UnitOfMeasure;
    if (!unit) {
      return NextResponse.json({ error: "Unidad requerida" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (unit === product.unit) {
      return NextResponse.json(
        { error: "No se puede eliminar la unidad base del producto" },
        { status: 400 }
      );
    }

    await prisma.productUnit.delete({
      where: { productId_unit: { productId, unit } },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
