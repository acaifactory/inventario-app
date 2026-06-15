import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña requeridos" },
        { status: 400 }
      );
    }

    const user = await loginUser(email, password);
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      {
        error:
          "Error del servidor. Si persiste, la base de datos puede estar iniciando — espera 10 segundos e intenta de nuevo.",
      },
      { status: 500 }
    );
  }
}
