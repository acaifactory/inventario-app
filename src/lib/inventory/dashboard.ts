import { prisma } from "@/lib/prisma";
import { getValuationSummary } from "./valuation";
import { getUsageAnalytics } from "./usage-analytics";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";
import { addDays, subDays } from "date-fns";
import { calculateFinancialPeriod } from "./financial-analysis";
import { formatQtyWithUnit, loanPendingInRegisteredUnit } from "@/lib/utils";

export async function getDashboardData() {
  const valuation = await getValuationSummary();
  const usage = await getUsageAnalytics();

  const stocks = await prisma.productStock.findMany({
    include: {
      product: { include: { category: true } },
      location: true,
    },
  });

  const lowStock = stocks
    .filter((s) => s.quantity <= s.product.minQuantity)
    .map((s) => ({
      id: s.product.id,
      name: s.product.name,
      category: s.product.category.name,
      location: s.location.name,
      quantity: s.quantity,
      minQuantity: s.product.minQuantity,
      unit: s.product.unit,
    }))
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 8);

  const recentMovements = await prisma.inventoryMovement.findMany({
    take: 8,
    orderBy: { date: "desc" },
    include: {
      product: true,
      location: true,
      user: { select: { name: true } },
    },
  });

  const recentPurchases = await prisma.purchaseInvoice.findMany({
    take: 5,
    orderBy: { date: "desc" },
    include: { supplier: true },
  });

  const pendingLoans = await prisma.loan.findMany({
    where: { status: { not: "COMPLETE_RETURN" } },
    include: { product: true },
    take: 5,
    orderBy: { date: "desc" },
  });

  const pendingLoansCount = await prisma.loan.count({
    where: { status: { not: "COMPLETE_RETURN" } },
  });

  const expiryThreshold = addDays(new Date(), EXPIRY_WARNING_DAYS);
  const expiringProducts = await prisma.product.findMany({
    where: {
      expirationDate: { lte: expiryThreshold },
      active: true,
    },
    orderBy: { expirationDate: "asc" },
    take: 5,
  });

  const weekStart = subDays(new Date(), 7);
  const latestPeriod = await prisma.financialPeriod.findFirst({
    where: { status: "CLOSED", totalSales: { gt: 0 } },
    orderBy: { endDate: "desc" },
  });

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  const financialPreview = admin
    ? await calculateFinancialPeriod({
        startDate: weekStart,
        endDate: new Date(),
        totalSales: latestPeriod?.totalSales ?? 0,
        targetFullCostPercent: latestPeriod?.targetFullCostPercent ?? 30,
        responsibleName: "Dashboard",
        userId: admin.id,
      })
    : null;

  const alerts = [
    ...lowStock.map((i) => ({
      type: "low_stock" as const,
      message: `${i.name} bajo mínimo (${i.location})`,
      href: "/products",
    })),
    ...pendingLoans.map((l) => {
      const pending = loanPendingInRegisteredUnit(l);
      const unit = l.registeredUnit ?? l.product.unit;
      return {
        type: "loan" as const,
        message: `Préstamo pendiente: ${l.product.name} (${formatQtyWithUnit(pending, unit)})`,
        href: "/loans",
      };
    }),
    ...expiringProducts.map((p) => ({
      type: "expiry" as const,
      message: `${p.name} por vencer`,
      href: "/products",
    })),
  ].slice(0, 6);

  return {
    totalValue: valuation.totalValue,
    cogsValue: valuation.cogsValue,
    foodCostValue: valuation.foodCostValue,
    packagingCostValue: valuation.packagingCostValue,
    byCategory: valuation.byCategory,
    lowStock,
    lowStockCount: stocks.filter((s) => s.quantity <= s.product.minQuantity).length,
    recentMovements,
    recentPurchases,
    pendingLoans,
    pendingLoansCount,
    expiringProducts,
    alerts,
    alertCount: alerts.length,
    financialPreview,
    latestPeriod,
    usage: {
      weeklyAvgQuantity: usage.weeklyAvgQuantity,
      weeklyAvgValue: usage.weeklyAvgValue,
      totalSuggestedCost: usage.totalSuggestedCost,
      urgentCount: usage.urgentCount,
      topSuggestions: usage.purchaseSuggestions.slice(0, 3),
    },
    mostUsed: usage.fastMovers.slice(0, 5),
  };
}
