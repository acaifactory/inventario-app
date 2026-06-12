import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  canManageUsers,
  hashPassword,
} from "@/lib/auth";
import type { Role } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!canManageUsers(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, role, active, password } = body as {
      name?: string;
      role?: Role;
      active?: boolean;
      password?: string;
    };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (active === false && user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", active: true, id: { not: id } },
      });
      if (adminCount === 0) {
        return NextResponse.json(
          { error: "Debe existir al menos un administrador activo" },
          { status: 400 }
        );
      }
    }

    if (id === session.id && active === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(role ? { role } : {}),
        ...(typeof active === "boolean" ? { active } : {}),
        ...(password && password.length >= 6
          ? { passwordHash: await hashPassword(password) }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!canManageUsers(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.id) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.role === "ADMIN" && user.active) {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", active: true, id: { not: id } },
      });
      if (adminCount === 0) {
        return NextResponse.json(
          { error: "Debe existir al menos un administrador activo" },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
