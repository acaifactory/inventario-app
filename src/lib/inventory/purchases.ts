import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import { recalculateProductAverageCost } from "./cost-average";
import { recordEntry, reverseMovement } from "./movements";
import { resolveQuantityToBase } from "./units";
import type { UnitOfMeasure } from "@prisma/client";

export type PurchaseLineInput = {
  productId: string;
  locationId: string;
  quantity: number;
  unit?: UnitOfMeasure;
  /** Cuántas unidades base contiene cada unidad comprada (solo si unit ≠ unidad base). */
  contentsPerUnit?: number;
  totalPrice: number;
};

export type PurchaseInvoiceInput = {
  invoiceNumber: string;
  supplierId: string;
  storeId?: string;
  date?: Date;
  registeredByName: string;
  userId: string;
  notes?: string;
  lines: PurchaseLineInput[];
};

type ResolvedPurchaseLine = Awaited<
  ReturnType<typeof resolvePurchaseLines>
>[number];

async function resolvePurchaseLines(lines: PurchaseLineInput[]) {
  if (!lines.length) throw new Error("NO_LINES");

  return Promise.all(
    lines.map(async (line) => {
      if (line.quantity <= 0) throw new Error("INVALID_QUANTITY");
      if (line.totalPrice < 0) throw new Error("INVALID_PRICE");

      const product = await prisma.product.findUniqueOrThrow({
        where: { id: line.productId },
      });
      const purchaseUnit = line.unit ?? product.unit;

      if (
        purchaseUnit !== product.unit &&
        (line.contentsPerUnit == null || line.contentsPerUnit <= 0)
      ) {
        throw new Error("MISSING_CONTENTS_PER_UNIT");
      }

      const resolved = await resolveQuantityToBase(
        line.productId,
        purchaseUnit,
        line.quantity,
        purchaseUnit !== product.unit
          ? { contentsPerUnit: line.contentsPerUnit }
          : undefined
      );

      const registeredUnitCost = line.totalPrice / line.quantity;
      const baseUnitCost =
        resolved.baseQuantity > 0
          ? line.totalPrice / resolved.baseQuantity
          : registeredUnitCost;

      return {
        ...line,
        product,
        purchaseUnit,
        resolved,
        registeredUnitCost,
        baseUnitCost,
      };
    })
  );
}

async function attachPurchaseMovements(
  input: PurchaseInvoiceInput,
  invoiceId: string,
  invoiceNumber: string,
  lines: { purchaseLine: { id: string }; line: ResolvedPurchaseLine }[]
) {
  for (const { purchaseLine, line } of lines) {
    const movement = await recordEntry({
      productId: line.productId,
      locationId: line.locationId,
      quantity: line.resolved.registeredQuantity,
      unit: line.resolved.registeredUnit,
      contentsPerUnit: line.contentsPerUnit,
      unitCost: line.registeredUnitCost,
      lineTotal: line.totalPrice,
      userId: input.userId,
      registeredByName: input.registeredByName,
      supplierId: input.supplierId,
      invoiceNumber,
      notes: input.notes,
      date: input.date,
      type: "PURCHASE",
      purchaseLineId: purchaseLine.id,
    });

    await prisma.purchaseInvoiceLine.update({
      where: { id: purchaseLine.id },
      data: { movementId: movement.id },
    });
  }

  return prisma.purchaseInvoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      supplier: true,
      lines: { include: { product: true, location: true } },
    },
  });
}

export async function recordPurchaseInvoice(input: PurchaseInvoiceInput) {
  const resolvedLines = await resolvePurchaseLines(input.lines);

  return prisma.$transaction(async (tx) => {
    let totalAmount = 0;

    for (const line of resolvedLines) {
      totalAmount += line.totalPrice;
    }

    const invoice = await tx.purchaseInvoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        supplierId: input.supplierId,
        storeId: input.storeId,
        date: input.date ?? new Date(),
        registeredByName: input.registeredByName,
        userId: input.userId,
        notes: input.notes,
        totalAmount,
      },
    });

    const createdLines = [];

    for (const line of resolvedLines) {
      const purchaseLine = await tx.purchaseInvoiceLine.create({
        data: {
          invoiceId: invoice.id,
          productId: line.productId,
          locationId: line.locationId,
          quantity: line.resolved.registeredQuantity,
          unit: line.resolved.registeredUnit,
          contentsPerUnit: line.resolved.contentsPerUnit,
          baseUnit: line.resolved.baseUnit,
          baseQuantity: line.resolved.baseQuantity,
          baseUnitCost: line.baseUnitCost,
          totalPrice: line.totalPrice,
          unitCost: line.registeredUnitCost,
        },
      });

      createdLines.push({ purchaseLine, line });
    }

    await writeAuditLog(tx, {
      userId: input.userId,
      registeredByName: input.registeredByName,
      action: "PURCHASE_INVOICE",
      entityType: "PurchaseInvoice",
      entityId: invoice.id,
      notes: input.notes,
      metadata: {
        invoiceNumber: input.invoiceNumber,
        lineCount: createdLines.length,
        totalAmount,
      },
    });

    return { invoice, lines: createdLines };
  }).then(async ({ invoice, lines }) =>
    attachPurchaseMovements(input, invoice.id, input.invoiceNumber, lines)
  );
}

export async function updatePurchaseInvoice(
  invoiceId: string,
  input: PurchaseInvoiceInput
) {
  const existing = await prisma.purchaseInvoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      lines: { include: { movement: true } },
    },
  });

  for (const line of existing.lines) {
    if (line.movementId && line.movement && !line.movement.reversedAt) {
      try {
        await reverseMovement(
          line.movementId,
          input.userId,
          input.registeredByName
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "CANNOT_REVERSE";
        if (message === "INSUFFICIENT_STOCK") {
          throw new Error("INSUFFICIENT_STOCK_FOR_EDIT");
        }
        throw error;
      }
    }
  }

  const affectedProducts = new Set([
    ...existing.lines.map((line) => line.productId),
    ...input.lines.map((line) => line.productId),
  ]);

  const resolvedLines = await resolvePurchaseLines(input.lines);

  const { createdLines } = await prisma.$transaction(async (tx) => {
    await tx.purchaseInvoiceLine.deleteMany({ where: { invoiceId } });

    let totalAmount = 0;
    for (const line of resolvedLines) {
      totalAmount += line.totalPrice;
    }

    await tx.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        invoiceNumber: input.invoiceNumber,
        supplierId: input.supplierId,
        storeId: input.storeId,
        date: input.date ?? existing.date,
        registeredByName: input.registeredByName,
        notes: input.notes,
        totalAmount,
      },
    });

    const createdLines = [];

    for (const line of resolvedLines) {
      const purchaseLine = await tx.purchaseInvoiceLine.create({
        data: {
          invoiceId,
          productId: line.productId,
          locationId: line.locationId,
          quantity: line.resolved.registeredQuantity,
          unit: line.resolved.registeredUnit,
          contentsPerUnit: line.resolved.contentsPerUnit,
          baseUnit: line.resolved.baseUnit,
          baseQuantity: line.resolved.baseQuantity,
          baseUnitCost: line.baseUnitCost,
          totalPrice: line.totalPrice,
          unitCost: line.registeredUnitCost,
        },
      });

      createdLines.push({ purchaseLine, line });
    }

    await writeAuditLog(tx, {
      userId: input.userId,
      registeredByName: input.registeredByName,
      action: "PURCHASE_INVOICE_UPDATE",
      entityType: "PurchaseInvoice",
      entityId: invoiceId,
      notes: input.notes,
      metadata: {
        invoiceNumber: input.invoiceNumber,
        lineCount: createdLines.length,
        totalAmount,
      },
    });

    return { createdLines };
  });

  await prisma.$transaction(async (tx) => {
    for (const productId of affectedProducts) {
      await recalculateProductAverageCost(tx, productId);
    }
  });

  return attachPurchaseMovements(
    input,
    invoiceId,
    input.invoiceNumber,
    createdLines
  );
}
