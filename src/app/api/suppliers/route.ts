import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManageCatalog } from "@/lib/auth";

const supplierInclude = {
  _count: {
    select: {
      products: true,
      purchaseInvoices: true,
      movements: true,
    },
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  const suppliers = await prisma.supplier.findMany({
    where: all ? undefined : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: supplierInclude,
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name as string)?.trim();
    const contact = (body.contact as string)?.trim() || null;
    const phone = (body.phone as string)?.trim() || null;
    const email = (body.email as string)?.trim().toLowerCase() || null;

    if (!name) {
      return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({ where: { name } });
    if (existing) {
      if (!existing.active) {
        const reactivated = await prisma.supplier.update({
          where: { id: existing.id },
          data: { active: true, contact, phone, email },
          include: supplierInclude,
        });
        return NextResponse.json(reactivated);
      }
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese nombre" },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: { name, contact, phone, email },
      include: supplierInclude,
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
