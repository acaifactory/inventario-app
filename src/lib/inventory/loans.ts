import { prisma } from "@/lib/prisma";
import type { LoanDirection, UnitOfMeasure } from "@prisma/client";
import { writeAuditLog } from "./audit";
import { reverseMovement } from "./movements";
import { getLocationStock } from "./stock-helpers";
import { resolveQuantityToBase, assertDynamicConversion } from "./units";

type CreateLoanInput = {
  direction: LoanDirection;
  productId: string;
  locationId: string;
  quantity: number;
  unit?: UnitOfMeasure;
  contentsPerUnit?: number;
  counterpartyName: string;
  responsibleName: string;
  registeredByName: string;
  userId: string;
  notes?: string;
  date?: Date;
};

export async function createLoan(input: CreateLoanInput) {
  if (input.quantity <= 0) throw new Error("INVALID_QUANTITY");

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: input.productId },
  });
  const loanUnit = input.unit ?? product.unit;
  assertDynamicConversion(product.unit, loanUnit, input.contentsPerUnit);
  const resolved = await resolveQuantityToBase(
    input.productId,
    loanUnit,
    input.quantity,
    input.contentsPerUnit != null ? { contentsPerUnit: input.contentsPerUnit } : undefined
  );

  return prisma.$transaction(async (tx) => {
    const unitCost = product.averageCost;
    const totalCost = resolved.baseQuantity * unitCost;
    const before = await getLocationStock(
      tx,
      input.productId,
      input.locationId
    );

    let after = before;
    const movementType = input.direction === "OUT" ? "LOAN_OUT" : "LOAN_IN";
    const stockDelta =
      input.direction === "OUT" ? -resolved.baseQuantity : resolved.baseQuantity;

    if (input.direction === "OUT") {
      if (before < resolved.baseQuantity) throw new Error("INSUFFICIENT_STOCK");
      after = before - resolved.baseQuantity;
      await tx.productStock.upsert({
        where: {
          productId_locationId: {
            productId: input.productId,
            locationId: input.locationId,
          },
        },
        create: {
          productId: input.productId,
          locationId: input.locationId,
          quantity: after,
        },
        update: { quantity: after },
      });
    } else {
      after = before + resolved.baseQuantity;
      await tx.productStock.upsert({
        where: {
          productId_locationId: {
            productId: input.productId,
            locationId: input.locationId,
          },
        },
        create: {
          productId: input.productId,
          locationId: input.locationId,
          quantity: after,
        },
        update: { quantity: after },
      });
    }

    const loan = await tx.loan.create({
      data: {
        direction: input.direction,
        productId: input.productId,
        locationId: input.locationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost,
        totalCost,
        counterpartyName: input.counterpartyName,
        responsibleName: input.responsibleName,
        registeredByName: input.registeredByName,
        userId: input.userId,
        notes: input.notes,
        date: input.date ?? new Date(),
        status: "PENDING",
      },
    });

    await tx.inventoryMovement.create({
      data: {
        type: movementType,
        productId: input.productId,
        locationId: input.locationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost,
        totalCost,
        exitReason: input.direction === "OUT" ? "LOAN" : undefined,
        registeredByName: input.registeredByName,
        notes: input.notes,
        userId: input.userId,
        date: input.date ?? new Date(),
        stockBefore: before,
        stockAfter: after,
        loanId: loan.id,
      },
    });

    await writeAuditLog(tx, {
      userId: input.userId,
      registeredByName: input.registeredByName,
      action: movementType,
      entityType: "Loan",
      entityId: loan.id,
      productId: input.productId,
      locationId: input.locationId,
      quantity: resolved.baseQuantity,
      stockBefore: before,
      stockAfter: after,
      notes: input.notes,
      metadata: {
        counterpartyName: input.counterpartyName,
        responsibleName: input.responsibleName,
        stockDelta,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
      },
      eventDate: input.date ?? new Date(),
    });

    return tx.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { product: true, location: true },
    });
  });
}

type ReturnLoanInput = {
  loanId: string;
  quantity: number;
  unit?: UnitOfMeasure;
  contentsPerUnit?: number;
  registeredByName: string;
  userId: string;
  notes?: string;
  date?: Date;
};

export async function returnLoan(input: ReturnLoanInput) {
  if (input.quantity <= 0) throw new Error("INVALID_QUANTITY");

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUniqueOrThrow({
      where: { id: input.loanId },
      include: { product: true },
    });

    const returnUnit =
      input.unit ?? loan.registeredUnit ?? loan.product.unit;
    assertDynamicConversion(
      loan.product.unit,
      returnUnit,
      input.contentsPerUnit
    );
    const resolved = await resolveQuantityToBase(
      loan.productId,
      returnUnit,
      input.quantity,
      input.contentsPerUnit != null
        ? { contentsPerUnit: input.contentsPerUnit }
        : undefined
    );

    const pendingBase = loan.quantity - loan.quantityReturned;
    if (resolved.baseQuantity > pendingBase) throw new Error("EXCEEDS_PENDING");

    const before = await getLocationStock(
      tx,
      loan.productId,
      loan.locationId
    );

    let after = before;
    if (loan.direction === "OUT") {
      after = before + resolved.baseQuantity;
      await tx.productStock.upsert({
        where: {
          productId_locationId: {
            productId: loan.productId,
            locationId: loan.locationId,
          },
        },
        create: {
          productId: loan.productId,
          locationId: loan.locationId,
          quantity: after,
        },
        update: { quantity: after },
      });
    } else {
      if (before < resolved.baseQuantity) throw new Error("INSUFFICIENT_STOCK");
      after = before - resolved.baseQuantity;
      await tx.productStock.update({
        where: {
          productId_locationId: {
            productId: loan.productId,
            locationId: loan.locationId,
          },
        },
        data: { quantity: after },
      });
    }

    const loanReturn = await tx.loanReturn.create({
      data: {
        loanId: loan.id,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        registeredByName: input.registeredByName,
        userId: input.userId,
        notes: input.notes,
        date: input.date ?? new Date(),
      },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        type: "LOAN_RETURN",
        productId: loan.productId,
        locationId: loan.locationId,
        quantity: resolved.baseQuantity,
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
        unitCost: loan.unitCost,
        totalCost: resolved.baseQuantity * loan.unitCost,
        registeredByName: input.registeredByName,
        notes: input.notes ?? `Devolución préstamo ${loan.id}`,
        userId: input.userId,
        date: input.date ?? new Date(),
        stockBefore: before,
        stockAfter: after,
        loanId: loan.id,
        loanReturnId: loanReturn.id,
      },
    });

    await tx.loanReturn.update({
      where: { id: loanReturn.id },
      data: { movementId: movement.id },
    });

    const newReturned = loan.quantityReturned + resolved.baseQuantity;
    const status =
      newReturned >= loan.quantity ? "COMPLETE_RETURN" : "PARTIAL_RETURN";

    await tx.loan.update({
      where: { id: loan.id },
      data: { quantityReturned: newReturned, status },
    });

    await writeAuditLog(tx, {
      userId: input.userId,
      registeredByName: input.registeredByName,
      action: "LOAN_RETURN",
      entityType: "LoanReturn",
      entityId: loanReturn.id,
      productId: loan.productId,
      locationId: loan.locationId,
      quantity: resolved.baseQuantity,
      stockBefore: before,
      stockAfter: after,
      notes: input.notes,
      metadata: {
        registeredUnit: resolved.registeredUnit,
        registeredQuantity: resolved.registeredQuantity,
      },
      eventDate: input.date ?? new Date(),
    });

    return tx.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { returns: true, product: true, location: true },
    });
  });
}

export async function updateLoan(loanId: string, input: CreateLoanInput) {
  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { movements: true, returns: true },
  });

  if (loan.quantityReturned > 0) {
    throw new Error("LOAN_HAS_RETURNS");
  }

  const mainMovement = loan.movements.find(
    (movement) =>
      !movement.isReversal &&
      !movement.reversedAt &&
      (movement.type === "LOAN_OUT" || movement.type === "LOAN_IN")
  );

  if (mainMovement) {
    try {
      await reverseMovement(
        mainMovement.id,
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

  await prisma.inventoryMovement.updateMany({
    where: { loanId },
    data: { loanId: null },
  });
  await prisma.loan.delete({ where: { id: loanId } });
  return createLoan(input);
}
