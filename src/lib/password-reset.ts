import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { buildResetPasswordUrl, sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;

  const rawToken = generateResetToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  const resetUrl = buildResetPasswordUrl(rawToken);
  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  return { user, resetUrl, emailResult };
}

export async function requestPasswordResetByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !user.active) {
    return { sent: false as const, reason: "not_found" as const };
  }

  const result = await createPasswordResetForUser(user.id);
  if (!result) {
    return { sent: false as const, reason: "not_found" as const };
  }

  return {
    sent: true as const,
    emailResult: result.emailResult,
  };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (!token || newPassword.length < 6) {
    return { ok: false as const, error: "Datos inválidos" };
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!record || !record.user.active) {
    return { ok: false as const, error: "Enlace inválido o expirado" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}
