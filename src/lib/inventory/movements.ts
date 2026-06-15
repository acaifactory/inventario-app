import { prisma } from "@/lib/prisma";
import type { ExitReason, Prisma, UnitOfMeasure } from "@prisma/client";
import { writeAuditLog } from "./audit";
import { recalculateProductAverageCost } from "./cost-average";
import { getLocationStock } from "./stock-helpers";
import { resolveQuantityToBase, assertDynamicConversion } from "./units";

interface BaseInput {
  registeredByName: string;
  notes?: string;
  date?: Date;
  unit?: UnitOfMeasure;
  contentsPerUnit?: number;
}

interface EntryInput extends BaseInput {
  productId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  /** Total de la línea (factura). Si se indica, normaliza costo a unidad base. */
  lineTotal?: number;
  /** Factor de conversión por unidad comprada (compras con empaque variable). */
  contentsPerUnit?: number;
  userId: string;
  supplierId?: string;
  invoiceNumber?: string;
  type?: "ENTRY" | "PURCHASE";
  purchaseLineId?: string;
}

interface ExitInput extends BaseInput {
  productId: string;
  locationId: string;
  quantity: number;
  exitReason: ExitReason;
  userId: string;
}

interface TransferInput extends BaseInput {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  userId: string;
  deliveredByName?: string;
  receivedByName?: string;
}

interface AdjustmentInput extends BaseInput {
  productId: string;
  locationId: string;
  countedQuantity: number;
  reason: string;
  userId: string;
  physicalCountId?: string;
}

async function applyStockDelta(
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string,
  delta: number
) {
  const before = await getLocationStock(tx, productId, locationId);
  const after = before + delta;
  if (after < 0) throw new Error("INSUFFICIENT_STOCK");

  await tx.productStock.upsert({
    where: { productId_locationId: { productId, locationId } },
    create: { productId, locationId, quantity: after },
    update: { quantity: after },
  });

  return { before, after };
}

export async function recordEntry(input: EntryInput) {
  const {
    productId,
    locationId,
    quantity,
    unitCost,
    userId,
    supplierId,
    invoiceNumber,
    registeredByName,
    notes,
    date = new Date(),
    type = "ENTRY",
    purchaseLineId,
    unit: inputUnit,
    lineTotal,
    contentsPerUnit,
  } = input;

  if (quantity <= 0) throw new Error("INVALID_QUANTITY");

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const purchaseUnit = inputUnit ?? product.unit;
  assertDynamicConversion(product.unit, purchaseUnit, contentsPerUnit);
  const resolved = await resolveQuantityToBase(
    productId,
    purchaseUnit,
    quantity,
    contentsPerUnit != null ? { contentsPerUnit } : undefined
  );

  return prisma.$transaction(async (tx) => {
    const { before, after } = await applyStockDelta(
      tx,
      productId,
      locationId,
      resolved.baseQuantity
    );

    const totalCost = lineTotal ?? quantity * unitCost;
    const baseUnitCost =
      resolved.baseQuantity > 0 ? totalCost / resolved.baseQuantity : unitCost;

    const movement = await tx.inventoryMovement.create({
      data: {
        type,
        productId,
        locationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost: baseUnitCost,
        totalCost,
        supplierId,
        invoiceNumber,
        registeredByName,
        notes,
        userId,
        date,
        stockBefore: before,
        stockAfter: after,
        purchaseLineId,
      },
    });

    await tx.costHistory.create({
      data: {
        productId,
        unitCost: baseUnitCost,
        quantity: resolved.baseQuantity,
        totalCost,
        movementId: movement.id,
        date,
      },
    });

    await recalculateProductAverageCost(tx, productId);

    await writeAuditLog(tx, {
      userId,
      registeredByName,
      action: type,
      entityType: "InventoryMovement",
      entityId: movement.id,
      productId,
      locationId,
      quantity: resolved.baseQuantity,
      stockBefore: before,
      stockAfter: after,
      notes,
      metadata: {
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
      },
      eventDate: date,
    });

    return movement;
  });
}

export async function recordExit(input: ExitInput) {
  const {
    productId,
    locationId,
    quantity,
    exitReason,
    userId,
    registeredByName,
    notes,
    date = new Date(),
    unit: inputUnit,
    contentsPerUnit,
  } = input;

  if (quantity <= 0) throw new Error("INVALID_QUANTITY");

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const purchaseUnit = inputUnit ?? product.unit;
  assertDynamicConversion(product.unit, purchaseUnit, contentsPerUnit);
  const resolved = await resolveQuantityToBase(
    productId,
    purchaseUnit,
    quantity,
    contentsPerUnit != null ? { contentsPerUnit } : undefined
  );

  return prisma.$transaction(async (tx) => {
    const { before, after } = await applyStockDelta(
      tx,
      productId,
      locationId,
      -resolved.baseQuantity
    );

    const movement = await tx.inventoryMovement.create({
      data: {
        type: "EXIT",
        productId,
        locationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost: product.averageCost,
        totalCost: resolved.baseQuantity * product.averageCost,
        exitReason,
        registeredByName,
        notes,
        userId,
        date,
        stockBefore: before,
        stockAfter: after,
      },
    });

    await writeAuditLog(tx, {
      userId,
      registeredByName,
      action: "EXIT",
      entityType: "InventoryMovement",
      entityId: movement.id,
      productId,
      locationId,
      quantity: resolved.baseQuantity,
      stockBefore: before,
      stockAfter: after,
      notes,
      metadata: {
        exitReason,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
      },
      eventDate: date,
    });

    return movement;
  });
}

export async function recordTransfer(input: TransferInput) {
  const {
    productId,
    fromLocationId,
    toLocationId,
    quantity,
    userId,
    registeredByName,
    deliveredByName,
    receivedByName,
    notes,
    date = new Date(),
    unit: inputUnit,
    contentsPerUnit,
  } = input;

  if (quantity <= 0) throw new Error("INVALID_QUANTITY");
  if (fromLocationId === toLocationId) throw new Error("SAME_LOCATION");

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const transferUnit = inputUnit ?? product.unit;
  assertDynamicConversion(product.unit, transferUnit, contentsPerUnit);
  const resolved = await resolveQuantityToBase(
    productId,
    transferUnit,
    quantity,
    contentsPerUnit != null ? { contentsPerUnit } : undefined
  );

  return prisma.$transaction(async (tx) => {
    const from = await applyStockDelta(
      tx,
      productId,
      fromLocationId,
      -resolved.baseQuantity
    );
    const to = await applyStockDelta(
      tx,
      productId,
      toLocationId,
      resolved.baseQuantity
    );

    const movementOut = await tx.inventoryMovement.create({
      data: {
        type: "TRANSFER_OUT",
        productId,
        locationId: fromLocationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost: product.averageCost,
        totalCost: resolved.baseQuantity * product.averageCost,
        exitReason: "TRANSFER",
        registeredByName,
        notes,
        userId,
        date,
        stockBefore: from.before,
        stockAfter: from.after,
      },
    });

    const movementIn = await tx.inventoryMovement.create({
      data: {
        type: "TRANSFER_IN",
        productId,
        locationId: toLocationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost: product.averageCost,
        totalCost: resolved.baseQuantity * product.averageCost,
        registeredByName,
        notes,
        userId,
        date,
        stockBefore: to.before,
        stockAfter: to.after,
      },
    });

    const transfer = await tx.transfer.create({
      data: {
        productId,
        fromLocationId,
        toLocationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        userId,
        registeredByName,
        deliveredByName,
        receivedByName,
        notes,
        date,
        movementOutId: movementOut.id,
        movementInId: movementIn.id,
      },
    });

    await writeAuditLog(tx, {
      userId,
      registeredByName,
      action: "TRANSFER",
      entityType: "Transfer",
      entityId: transfer.id,
      productId,
      locationId: fromLocationId,
      quantity: resolved.baseQuantity,
      stockBefore: from.before,
      stockAfter: from.after,
      notes,
      metadata: {
        toLocationId,
        deliveredByName,
        receivedByName,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
      },
      eventDate: date,
    });

    return transfer;
  });
}

export async function recordAdjustment(input: AdjustmentInput) {
  const {
    productId,
    locationId,
    countedQuantity,
    reason,
    userId,
    registeredByName,
    notes,
    physicalCountId,
    date = new Date(),
    unit: inputUnit,
    contentsPerUnit,
  } = input;

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });

  const adjustmentUnit = inputUnit ?? product.unit;
  let resolved;
  if (physicalCountId) {
    resolved = await resolveQuantityToBase(
      productId,
      product.unit,
      countedQuantity
    );
  } else {
    assertDynamicConversion(product.unit, adjustmentUnit, contentsPerUnit);
    resolved = await resolveQuantityToBase(
      productId,
      adjustmentUnit,
      countedQuantity,
      contentsPerUnit != null ? { contentsPerUnit } : undefined
    );
  }
  const countedBase = resolved.baseQuantity;

  return prisma.$transaction(async (tx) => {
    const before = await getLocationStock(tx, productId, locationId);
    const difference = countedBase - before;

    if (difference === 0) {
      return tx.inventoryAdjustment.create({
        data: {
          productId,
          locationId,
          expectedQuantity: before,
          countedQuantity: countedBase,
          difference: 0,
          reason,
          userId,
          registeredByName,
          notes,
          physicalCountId,
          date,
        },
      });
    }

    const productRow = await tx.product.findUniqueOrThrow({
      where: { id: productId },
    });

    await tx.productStock.upsert({
      where: { productId_locationId: { productId, locationId } },
      create: { productId, locationId, quantity: countedBase },
      update: { quantity: countedBase },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        type: "ADJUSTMENT",
        productId,
        locationId,
        quantity: Math.abs(difference),
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost: productRow.averageCost,
        totalCost: Math.abs(difference) * productRow.averageCost,
        exitReason: difference < 0 ? "ADJUSTMENT" : undefined,
        registeredByName,
        notes: `Ajuste: ${reason}. ${notes ?? ""}`.trim(),
        userId,
        date,
        stockBefore: before,
        stockAfter: countedBase,
      },
    });

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        productId,
        locationId,
        expectedQuantity: before,
        countedQuantity: countedBase,
        difference,
        reason,
        userId,
        registeredByName,
        notes,
        physicalCountId,
        movementId: movement.id,
        date,
      },
    });

    await writeAuditLog(tx, {
      userId,
      registeredByName,
      action: "ADJUSTMENT",
      entityType: "InventoryAdjustment",
      entityId: adjustment.id,
      productId,
      locationId,
      quantity: Math.abs(difference),
      stockBefore: before,
      stockAfter: countedBase,
      notes: reason,
      metadata: {
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
      },
      eventDate: date,
    });

    return adjustment;
  });
}

export async function reverseMovement(
  movementId: string,
  userId: string,
  registeredByName: string
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.inventoryMovement.findUniqueOrThrow({
      where: { id: movementId },
      include: { reversedFrom: true },
    });

    if (original.reversedAt || original.isReversal) {
      throw new Error("ALREADY_REVERSED");
    }

    const stockIncreased = [
      "ENTRY",
      "PURCHASE",
      "TRANSFER_IN",
      "LOAN_IN",
      "LOAN_RETURN",
    ].includes(original.type);

    const reverseType = stockIncreased ? "EXIT" : "ENTRY";

    if (original.type === "ADJUSTMENT") throw new Error("CANNOT_REVERSE");

    const delta = reverseType === "EXIT" ? -original.quantity : original.quantity;
    const { before, after } = await applyStockDelta(
      tx,
      original.productId,
      original.locationId,
      delta
    );

    const reversal = await tx.inventoryMovement.create({
      data: {
        type: reverseType,
        productId: original.productId,
        locationId: original.locationId,
        quantity: original.quantity,
        unitCost: original.unitCost,
        totalCost: original.totalCost,
        exitReason: reverseType === "EXIT" ? "ADJUSTMENT" : undefined,
        registeredByName,
        notes: `Reversión de movimiento ${original.id}`,
        userId,
        isReversal: true,
        reversalOfId: original.id,
        stockBefore: before,
        stockAfter: after,
      },
    });

    await tx.inventoryMovement.update({
      where: { id: original.id },
      data: { reversedAt: new Date(), reversedById: userId },
    });

    await writeAuditLog(tx, {
      userId,
      registeredByName,
      action: "REVERSAL",
      entityType: "InventoryMovement",
      entityId: reversal.id,
      productId: original.productId,
      locationId: original.locationId,
      quantity: original.quantity,
      stockBefore: before,
      stockAfter: after,
      notes: `Reversión de ${original.id}`,
    });

    return reversal;
  });
}

export async function updateInventoryMovement(
  movementId: string,
  kind: "entry" | "exit",
  input: EntryInput | ExitInput
) {
  const existing = await prisma.inventoryMovement.findUniqueOrThrow({
    where: { id: movementId },
  });

  if (existing.isReversal || existing.reversedAt) {
    throw new Error("ALREADY_REVERSED");
  }
  if (existing.purchaseLineId || existing.type === "PURCHASE") {
    throw new Error("CANNOT_EDIT_PURCHASE");
  }
  if (kind === "entry" && existing.type !== "ENTRY") {
    throw new Error("CANNOT_EDIT");
  }
  if (kind === "exit" && existing.type !== "EXIT") {
    throw new Error("CANNOT_EDIT");
  }

  try {
    await reverseMovement(movementId, input.userId, input.registeredByName);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CANNOT_REVERSE";
    if (message === "INSUFFICIENT_STOCK") {
      throw new Error("INSUFFICIENT_STOCK_FOR_EDIT");
    }
    throw error;
  }

  if (kind === "entry") {
    return recordEntry({ ...(input as EntryInput), type: "ENTRY" });
  }
  return recordExit(input as ExitInput);
}

export async function updateTransfer(transferId: string, input: TransferInput) {
  const existing = await prisma.transfer.findUniqueOrThrow({
    where: { id: transferId },
    include: { movementOut: true, movementIn: true },
  });

  for (const movement of [existing.movementOut, existing.movementIn]) {
    if (!movement.reversedAt) {
      try {
        await reverseMovement(
          movement.id,
          input.userId,
          input.registeredByName
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "CANNOT_REVERSE";
        if (message === "INSUFFICIENT_STOCK") {
          throw new Error("INSUFFICIENT_STOCK_FOR_EDIT");
        }
        throw error;
      }
    }
  }

  await prisma.transfer.delete({ where: { id: transferId } });
  return recordTransfer(input);
}
