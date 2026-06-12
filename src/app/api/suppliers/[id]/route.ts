import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManageCatalog } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const supplierInclude = {
  _count: {
    select: {
      products: true,
      purchaseInvoices: true,
      movements: true,
    },
  },
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    const name = body.name != null ? (body.name as string).trim() : undefined;
    if (name === "") {
      return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    }

    if (name && name !== supplier.name) {
      const conflict = await prisma.supplier.findUnique({ where: { name } });
      if (conflict) {
        return NextResponse.json(
          { error: "Ya existe otro proveedor con ese nombre" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(body.contact !== undefined
          ? { contact: (body.contact as string)?.trim() || null }
          : {}),
        ...(body.phone !== undefined
          ? { phone: (body.phone as string)?.trim() || null }
          : {}),
        ...(body.email !== undefined
          ? {
              email: (body.email as string)?.trim().toLowerCase() || null,
            }
          : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      },
      include: supplierInclude,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

/** Desactivar proveedor — conserva facturas, movimientos y productos vinculados */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: supplierInclude,
    });

    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    if (!supplier.active) {
      return NextResponse.json({ ok: true, message: "Ya estaba inactivo" });
    }

    await prisma.supplier.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      ok: true,
      message: `Proveedor desactivado. Se conservan ${supplier._count.purchaseInvoices} facturas y ${supplier._count.movements} movimientos.`,
    });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
