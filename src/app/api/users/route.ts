import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  canManageUsers,
  hashPassword,
} from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await requireSession();
    if (!canManageUsers(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canManageUsers(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, role } = body as {
      email?: string;
      name?: string;
      password?: string;
      role?: Role;
    };

    if (!email?.trim() || !name?.trim() || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Correo, nombre y contraseña (mín. 6) son obligatorios" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "El correo ya existe" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash: await hashPassword(password),
        role: role ?? "EMPLOYEE",
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

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
