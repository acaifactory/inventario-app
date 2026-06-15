import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { recordAdjustment } from "@/lib/inventory/movements";
import { revalidateInventoryViews } from "@/lib/inventory/revalidate-views";
import {
  computePhysicalCountDifference,
  computePhysicalCountResult,
  parseCountedUnits,
  parseUnitFactors,
  serializeCountedUnits,
  serializeUnitFactors,
} from "@/lib/inventory/physical-count";
import { resolveLocationId } from "@/lib/stores/resolve-transfer-locations";

const productInclude = {
  category: true,
  units: true,
} as const;

function itemPayload(
  expectedQuantity: number,
  countedUnitsRaw: unknown,
  countedUnitFactorsRaw: unknown,
  product: {
    unit: import("@prisma/client").UnitOfMeasure;
    units: {
      unit: import("@prisma/client").UnitOfMeasure;
      conversionFactor: number;
      label?: string | null;
    }[];
  }
) {
  const countedUnits = parseCountedUnits(countedUnitsRaw);
  const countedUnitFactors = parseUnitFactors(countedUnitFactorsRaw);
  const result = computePhysicalCountResult(
    product,
    countedUnits,
    countedUnitFactors
  );
  const countedQuantity = result.total;

  return {
    countedUnits: serializeCountedUnits(countedUnits),
    countedUnitFactors: serializeUnitFactors(countedUnitFactors),
    countedQuantity,
    difference: computePhysicalCountDifference(
      expectedQuantity,
      countedQuantity
    ),
  };
}

export async function GET() {
  const counts = await prisma.physicalCount.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      location: true,
      startedBy: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
  return NextResponse.json(counts);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { action, physicalCountId, name, locationId, storeId, items } = body;

    if (action === "create") {
      const resolvedLocationId = await resolveLocationId({
        locationId,
        storeId,
      });

      const products = await prisma.product.findMany({
        where: { active: true },
        include: {
          units: true,
          stocks: { where: { locationId: resolvedLocationId } },
        },
      });

      const count = await prisma.physicalCount.create({
        data: {
          name: name ?? `Conteo ${new Date().toLocaleDateString("es")}`,
          status: "IN_PROGRESS",
          locationId: resolvedLocationId,
          startedById: session.id,
          items: {
            create: products.map((p) => {
              const expected =
                p.stocks.find((s) => s.locationId === resolvedLocationId)
                  ?.quantity ?? 0;
              return {
                productId: p.id,
                expectedQuantity: expected,
              };
            }),
          },
        },
        include: {
          items: { include: { product: { include: productInclude } } },
          location: true,
        },
      });

      return NextResponse.json(count, { status: 201 });
    }

    if (action === "save" && physicalCountId && items) {
      for (const item of items) {
        const row = await prisma.physicalCountItem.findUniqueOrThrow({
          where: { id: item.id },
          include: { product: { include: { units: true } } },
        });

        const payload = itemPayload(
          row.expectedQuantity,
          item.countedUnits,
          item.countedUnitFactors,
          row.product
        );

        await prisma.physicalCountItem.update({
          where: { id: item.id },
          data: payload,
        });
      }

      const count = await prisma.physicalCount.findUnique({
        where: { id: physicalCountId },
        include: {
          items: { include: { product: { include: productInclude } } },
        },
      });

      return NextResponse.json(count);
    }

    if (action === "finalize" && physicalCountId) {
      const count = await prisma.physicalCount.findUniqueOrThrow({
        where: { id: physicalCountId },
        include: {
          items: { include: { product: { include: { units: true } } } },
        },
      });

      if (!count.locationId) {
        return NextResponse.json(
          { error: "El conteo debe tener una localidad para finalizar" },
          { status: 400 }
        );
      }

      for (const item of count.items) {
        const counts = parseCountedUnits(item.countedUnits);
        const factors = parseUnitFactors(item.countedUnitFactors);
        const result = computePhysicalCountResult(
          item.product,
          counts,
          factors
        );
        if (result.missingUnits.length > 0) {
          return NextResponse.json(
            {
              error: `En ${item.product.name}: indica cuánto contiene cada unidad contada (${result.missingUnits.join(", ")}) en la unidad base del producto.`,
            },
            { status: 400 }
          );
        }
      }

      for (const item of count.items) {
        if (item.countedQuantity == null) continue;
        if (item.difference === 0) continue;

        await recordAdjustment({
          productId: item.productId,
          locationId: count.locationId,
          countedQuantity: item.countedQuantity,
          reason: "Conteo físico",
          userId: session.id,
          registeredByName: session.name,
          physicalCountId: count.id,
          notes: `Conteo: ${count.name}`,
        });
      }

      const finalized = await prisma.physicalCount.update({
        where: { id: physicalCountId },
        data: { status: "COMPLETED", completedAt: new Date() },
        include: {
          items: { include: { product: { include: productInclude } } },
        },
      });

      revalidateInventoryViews();
      return NextResponse.json(finalized);
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
