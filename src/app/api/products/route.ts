import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canManageCatalog } from "@/lib/auth";
import { resolveLocationId } from "@/lib/stores/resolve-transfer-locations";
import { defaultCountUnitsForBase } from "@/lib/catalog/default-count-units";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const locationId = searchParams.get("locationId");
    const financialClassification = searchParams.get("financialClassification");
    const search = searchParams.get("search");

    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(categoryId ? { categoryId } : {}),
        ...(financialClassification
          ? {
              financialClassification:
                financialClassification as import("@prisma/client").FinancialClassification,
            }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        supplier: true,
        units: true,
        stocks: {
          include: { location: true },
          ...(locationId ? { where: { locationId } } : {}),
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      categoryId,
      subcategory,
      financialClassification,
      includeInFoodCost,
      unit,
      sku,
      minQuantity,
      supplierId,
      expirationDate,
      averageCost,
      notes,
      locationId,
      initialQuantity,
      alternateUnits,
      storeId,
    } = body;

    const resolvedLocationId = storeId
      ? await resolveLocationId({ storeId })
      : locationId;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          categoryId,
          subcategory: subcategory ?? "",
          financialClassification: financialClassification ?? "FOOD_COST",
          includeInFoodCost: includeInFoodCost ?? true,
          unit,
          sku: sku || null,
          minQuantity: minQuantity ?? 0,
          supplierId: supplierId || null,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          averageCost: averageCost ?? 0,
          notes: notes || null,
        },
        include: { category: true, supplier: true, units: true },
      });

      await tx.productUnit.create({
        data: { productId: created.id, unit, conversionFactor: 1 },
      });

      if (Array.isArray(alternateUnits)) {
        for (const alt of alternateUnits as {
          unit: string;
          conversionFactor: number;
          label?: string;
        }[]) {
          if (!alt.unit || alt.unit === unit) continue;
          await tx.productUnit.create({
            data: {
              productId: created.id,
              unit: alt.unit as import("@prisma/client").UnitOfMeasure,
              conversionFactor: Number(alt.conversionFactor) || 1,
              label: alt.label || null,
            },
          });
        }
      } else {
        for (const alt of defaultCountUnitsForBase(
          unit as import("@prisma/client").UnitOfMeasure
        )) {
          await tx.productUnit.create({
            data: {
              productId: created.id,
              unit: alt.unit,
              conversionFactor: alt.conversionFactor,
              label: alt.label ?? null,
            },
          });
        }
      }

      if (resolvedLocationId && initialQuantity > 0) {
        await tx.productStock.create({
          data: {
            productId: created.id,
            locationId: resolvedLocationId,
            quantity: initialQuantity,
          },
        });
      }

      return created;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
