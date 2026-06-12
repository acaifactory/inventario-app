import { NextRequest, NextResponse } from "next/server";
import { requestPasswordResetByEmail } from "@/lib/password-reset";

const GENERIC_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email as string)?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Correo obligatorio" },
        { status: 400 }
      );
    }

    await requestPasswordResetByEmail(email);

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
