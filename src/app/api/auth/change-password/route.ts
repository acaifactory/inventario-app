import { NextRequest, NextResponse } from "next/server";
import { requireSession, verifyPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const currentPassword = body.currentPassword as string;
    const newPassword = body.newPassword as string;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Contraseña actual y nueva (mín. 6) son obligatorias" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.id },
    });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Contraseña actual incorrecta" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return NextResponse.json({ message: "Contraseña actualizada" });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
