import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValuationSummary } from "@/lib/inventory/valuation";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";
import { addDays } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "current";
  const categoryId = searchParams.get("categoryId");
  const locationId = searchParams.get("locationId");
  const productId = searchParams.get("productId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      : undefined;

  switch (type) {
    case "current": {
      const stocks = await prisma.productStock.findMany({
        where: {
          ...(locationId ? { locationId } : {}),
          ...(productId ? { productId } : {}),
          product: {
            ...(categoryId ? { categoryId } : {}),
            active: true,
          },
        },
        include: {
          product: { include: { category: true, supplier: true } },
          location: true,
        },
      });
      return NextResponse.json(stocks);
    }

    case "valued": {
      const data = await getValuationSummary(locationId ?? undefined);
      return NextResponse.json(data);
    }

    case "low-stock": {
      const stocks = await prisma.productStock.findMany({
        include: { product: { include: { category: true } }, location: true },
      });
      return NextResponse.json(
        stocks.filter((s) => s.quantity <= s.product.minQuantity)
      );
    }

    case "entries":
    case "exits":
    case "waste":
    case "transfers":
    case "adjustments": {
      if (type === "transfers") {
        const transfers = await prisma.transfer.findMany({
          where: dateFilter ? { date: dateFilter } : undefined,
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
            user: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        });
        return NextResponse.json(transfers);
      }

      if (type === "adjustments") {
        const adjustments = await prisma.inventoryAdjustment.findMany({
          where: dateFilter ? { date: dateFilter } : undefined,
          include: {
            product: true,
            location: true,
            user: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        });
        return NextResponse.json(adjustments);
      }

      const movements = await prisma.inventoryMovement.findMany({
        where: {
          ...(dateFilter ? { date: dateFilter } : {}),
          ...(locationId ? { locationId } : {}),
          ...(productId ? { productId } : {}),
          product: categoryId ? { categoryId } : undefined,
          type: type === "entries" ? "ENTRY" : "EXIT",
          ...(type === "waste" ? { exitReason: "WASTE" } : {}),
          ...(type === "exits" && !searchParams.get("all")
            ? { exitReason: { not: "WASTE" } }
            : {}),
        },
        include: {
          product: { include: { category: true } },
          location: true,
          user: { select: { name: true } },
          supplier: true,
        },
        orderBy: { date: "desc" },
      });
      return NextResponse.json(movements);
    }

    case "expiring": {
      const products = await prisma.product.findMany({
        where: {
          expirationDate: { lte: addDays(new Date(), EXPIRY_WARNING_DAYS) },
          active: true,
        },
        include: { category: true, supplier: true },
        orderBy: { expirationDate: "asc" },
      });
      return NextResponse.json(products);
    }

    case "consumption": {
      const consumption = await prisma.inventoryMovement.groupBy({
        by: ["productId"],
        where: {
          type: "EXIT",
          ...(dateFilter ? { date: dateFilter } : {}),
          isReversal: false,
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
      });

      const products = await prisma.product.findMany({
        where: { id: { in: consumption.map((c) => c.productId) } },
        include: { category: true },
      });

      return NextResponse.json(
        consumption.map((c) => ({
          product: products.find((p) => p.id === c.productId),
          totalConsumed: c._sum.quantity,
        }))
      );
    }

    case "count-differences": {
      const counts = await prisma.physicalCount.findMany({
        where: { status: "COMPLETED" },
        include: {
          items: { include: { product: { include: { category: true } } } },
          location: true,
        },
        orderBy: { completedAt: "desc" },
      });
      return NextResponse.json(counts);
    }

    case "purchases": {
      const invoices = await prisma.purchaseInvoice.findMany({
        where: dateFilter ? { date: dateFilter } : undefined,
        include: {
          supplier: true,
          store: true,
          user: { select: { name: true } },
          lines: {
            include: {
              product: { include: { category: true } },
              location: true,
            },
          },
        },
        orderBy: { date: "desc" },
      });

      const rows = invoices.flatMap((inv) => {
        if (inv.lines.length === 0) {
          return [
            {
              fecha: inv.date,
              factura: inv.invoiceNumber,
              proveedor: inv.supplier.name,
              tienda: inv.store?.name ?? null,
              producto: "",
              categoria: "",
              localidad: "",
              cantidad: 0,
              unidad: "",
              costoUnitario: 0,
              totalLinea: 0,
              totalFactura: inv.totalAmount,
              registradoPor: inv.registeredByName,
            },
          ];
        }
        return inv.lines.map((line) => ({
          fecha: inv.date,
          factura: inv.invoiceNumber,
          proveedor: inv.supplier.name,
          tienda: inv.store?.name ?? null,
          producto: line.product.name,
          categoria: line.product.category.name,
          localidad: line.location.name,
          cantidad: line.quantity,
          unidad: line.unit,
          costoUnitario: line.unitCost,
          totalLinea: line.totalPrice,
          totalFactura: inv.totalAmount,
          registradoPor: inv.registeredByName,
        }));
      });

      return NextResponse.json(rows);
    }

    case "loans": {
      const loans = await prisma.loan.findMany({
        where: dateFilter ? { date: dateFilter } : undefined,
        include: {
          product: { include: { category: true } },
          location: true,
          user: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      });

      return NextResponse.json(
        loans.map((l) => ({
          fecha: l.date,
          direccion: l.direction,
          producto: l.product.name,
          categoria: l.product.category.name,
          localidad: l.location.name,
          cantidad: l.quantity,
          cantidadRegistrada: l.registeredQuantity,
          unidadRegistrada: l.registeredUnit,
          devuelto: l.quantityReturned,
          pendiente: l.quantity - l.quantityReturned,
          estado: l.status,
          contraparte: l.counterpartyName,
          costoUnitario: l.unitCost,
          costoTotal: l.totalCost,
          responsable: l.responsibleName,
          registradoPor: l.registeredByName,
        }))
      );
    }

    case "costs": {
      const valuation = await getValuationSummary(locationId ?? undefined);

      const periods = await prisma.financialPeriod.findMany({
        where: {
          status: "CLOSED",
          ...(dateFilter ? { endDate: dateFilter } : {}),
        },
        orderBy: { endDate: "desc" },
      });

      const stockSummary = [
        {
          seccion: "Valorización actual",
          concepto: "Food Cost (stock)",
          valor: valuation.foodCostValue,
        },
        {
          seccion: "Valorización actual",
          concepto: "Packaging Cost (stock)",
          valor: valuation.packagingCostValue,
        },
        {
          seccion: "Valorización actual",
          concepto: "COGS (Food + Packaging)",
          valor: valuation.cogsValue,
        },
        {
          seccion: "Valorización actual",
          concepto: "Inventario total",
          valor: valuation.totalValue,
        },
        ...valuation.byFinancial.map((f) => ({
          seccion: "Por clasificación",
          concepto: f.label,
          clasificacion: f.classification,
          valor: f.value,
          enCogs: f.inCogs,
        })),
      ];

      const periodRows = periods.map((p) => ({
        seccion: "Período financiero",
        concepto: `${p.startDate.toISOString().slice(0, 10)} — ${p.endDate.toISOString().slice(0, 10)}`,
        ventas: p.totalSales,
        costOfSales: p.costOfSales,
        fullCostPct: p.actualFullCostPercent,
        objetivoPct: p.targetFullCostPercent,
        oportunidad: p.opportunityDollars,
        responsable: p.responsibleName,
      }));

      return NextResponse.json([...stockSummary, ...periodRows]);
    }

    default:
      return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
  }
}
