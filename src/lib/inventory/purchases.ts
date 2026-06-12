import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import { recordEntry } from "./movements";
import { resolveQuantityToBase } from "./units";
import type { UnitOfMeasure } from "@prisma/client";

export type PurchaseLineInput = {
  productId: string;
  locationId: string;
  quantity: number;
  unit?: UnitOfMeasure;
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

export async function recordPurchaseInvoice(input: PurchaseInvoiceInput) {
  if (!input.lines.length) throw new Error("NO_LINES");

  const resolvedLines = await Promise.all(
    input.lines.map(async (line) => {
      if (line.quantity <= 0) throw new Error("INVALID_QUANTITY");

      const product = await prisma.product.findUniqueOrThrow({
        where: { id: line.productId },
      });
      const resolved = await resolveQuantityToBase(
        line.productId,
        line.unit ?? product.unit,
        line.quantity
      );
      const registeredUnitCost = line.totalPrice / line.quantity;
      const baseUnitCost = line.totalPrice / resolved.baseQuantity;

      return {
        ...line,
        product,
        resolved,
        registeredUnitCost,
        baseUnitCost,
      };
    })
  );

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
  }).then(async ({ invoice, lines }) => {
    for (const { purchaseLine, line } of lines) {
      const movement = await recordEntry({
        productId: line.productId,
        locationId: line.locationId,
        quantity: line.resolved.registeredQuantity,
        unit: line.resolved.registeredUnit,
        unitCost: line.registeredUnitCost,
        lineTotal: line.totalPrice,
        userId: input.userId,
        registeredByName: input.registeredByName,
        supplierId: input.supplierId,
        invoiceNumber: input.invoiceNumber,
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
      where: { id: invoice.id },
      include: {
        supplier: true,
        lines: { include: { product: true, location: true } },
      },
    });
  });
}
