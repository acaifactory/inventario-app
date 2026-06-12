import { NextRequest, NextResponse } from "next/server";
import { requireSession, canManageUsers } from "@/lib/auth";
import { createPasswordResetForUser } from "@/lib/password-reset";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
    if (!canManageUsers(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const result = await createPasswordResetForUser(id);

    if (!result) {
      return NextResponse.json(
        { error: "Usuario no encontrado o inactivo" },
        { status: 404 }
      );
    }

    if (!result.emailResult.ok) {
      return NextResponse.json(
        {
          error:
            result.emailResult.error ??
            "No se pudo enviar el correo. Revisa la configuración de Resend.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: `Enlace enviado a ${result.user.email}`,
      devResetUrl: result.emailResult.dev ? result.resetUrl : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
