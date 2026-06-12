import type { Prisma } from "@prisma/client";

type AuditInput = {
  userId: string;
  registeredByName: string;
  action: string;
  entityType: string;
  entityId?: string;
  productId?: string;
  locationId?: string;
  quantity?: number;
  stockBefore?: number;
  stockAfter?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  /** Fecha operativa del movimiento (puede ser distinta a createdAt) */
  eventDate?: Date;
};

export function getAuditLogEventDate(log: {
  createdAt: Date;
  metadata: string | null;
}) {
  if (log.metadata) {
    try {
      const parsed = JSON.parse(log.metadata) as { eventDate?: string };
      if (parsed.eventDate) return new Date(parsed.eventDate);
    } catch {
      /* metadata inválido */
    }
  }
  return log.createdAt;
}

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  input: AuditInput
) {
  const metadata = {
    ...(input.metadata ?? {}),
    ...(input.eventDate
      ? { eventDate: input.eventDate.toISOString() }
      : {}),
  };

  return tx.auditLog.create({
    data: {
      userId: input.userId,
      registeredByName: input.registeredByName,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      productId: input.productId,
      locationId: input.locationId,
      quantity: input.quantity,
      stockBefore: input.stockBefore,
      stockAfter: input.stockAfter,
      notes: input.notes,
      metadata: Object.keys(metadata).length ? JSON.stringify(metadata) : null,
    },
  });
}

export function requireRegisteredByName(name: unknown): string {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) throw new Error("REGISTERED_BY_REQUIRED");
  return value;
}
