const APP_NAME = "Inventario Açaí Factory";

function getAppUrl() {
  return (
    process.env.APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function normalizeAppUrl(base: string) {
  if (base.startsWith("http")) return base;
  return `https://${base}`;
}

export function buildResetPasswordUrl(token: string) {
  const base = normalizeAppUrl(getAppUrl());
  return `${base}/login/reset?token=${encodeURIComponent(token)}`;
}

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SendEmailResult =
  | { ok: true; dev: boolean }
  | { ok: false; error: string; raw?: string };

function parseResendError(errText: string): string {
  try {
    const data = JSON.parse(errText) as { message?: string };
    const msg = data.message ?? errText;

    if (
      msg.toLowerCase().includes("only send testing emails") ||
      msg.toLowerCase().includes("verify a domain")
    ) {
      return (
        "Resend en modo prueba solo permite enviar al correo de tu cuenta Resend. " +
        "Para enviar a otros usuarios (ej. eduolivopr@aol.com), verifica un dominio en resend.com → Domains."
      );
    }

    return msg;
  } catch {
    return errText.slice(0, 300);
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ??
    "Inventario Açaí Factory <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("[email:dev]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true as const, dev: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
    return { ok: false as const, error: parseResendError(err), raw: err };
  }

  return { ok: true as const, dev: false };
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const subject = `${APP_NAME} — Restablecer contraseña`;
  const text = [
    `Hola ${input.name},`,
    "",
    "Recibimos una solicitud para restablecer tu contraseña.",
    "Si fuiste tú, usa este enlace (válido 1 hora):",
    input.resetUrl,
    "",
    "Si no solicitaste esto, ignora este correo.",
    "",
    APP_NAME,
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
      <h2 style="color:#7c3aed">${APP_NAME}</h2>
      <p>Hola <strong>${input.name}</strong>,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p style="margin:24px 0">
        <a href="${input.resetUrl}" style="background:#7c3aed;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">
          Restablecer contraseña
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">Este enlace expira en 1 hora. Si no solicitaste el cambio, puedes ignorar este correo.</p>
      <p style="font-size:12px;color:#94a3b8;word-break:break-all">${input.resetUrl}</p>
    </div>
  `;

  return sendEmail({ to: input.to, subject, html, text });
}
