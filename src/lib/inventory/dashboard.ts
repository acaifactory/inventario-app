import { prisma } from "@/lib/prisma";
import { getValuationSummary } from "./valuation";
import { getUsageAnalytics } from "./usage-analytics";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";
import { addDays, subDays } from "date-fns";
import { calculateFinancialPeriod } from "./financial-analysis";
import { formatQtyWithUnit, loanPendingInRegisteredUnit } from "@/lib/utils";

const emptyUsage = {
  weeklyAvgQuantity: 0,
  weeklyAvgValue: 0,
  totalSuggestedCost: 0,
  urgentCount: 0,
  purchaseSuggestions: [] as Awaited<
    ReturnType<typeof getUsageAnalytics>
  >["purchaseSuggestions"],
  fastMovers: [] as Awaited<ReturnType<typeof getUsageAnalytics>>["fastMovers"],
};

export async function getDashboardData() {
  const expiryThreshold = addDays(new Date(), EXPIRY_WARNING_DAYS);
  const weekStart = subDays(new Date(), 7);

  const [
    valuation,
    usageResult,
    stocks,
    recentMovements,
    recentPurchases,
    pendingLoans,
    pendingLoansCount,
    expiringProducts,
    latestPeriod,
    admin,
  ] = await Promise.all([
    getValuationSummary(),
    getUsageAnalytics().catch(() => emptyUsage),
    prisma.productStock.findMany({
      include: {
        product: { include: { category: true } },
        location: true,
      },
    }),
    prisma.inventoryMovement.findMany({
      take: 8,
      orderBy: { date: "desc" },
      include: {
        product: true,
        location: true,
        user: { select: { name: true } },
      },
    }),
    prisma.purchaseInvoice.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { supplier: true },
    }),
    prisma.loan.findMany({
      where: { status: { not: "COMPLETE_RETURN" } },
      include: { product: true },
      take: 5,
      orderBy: { date: "desc" },
    }),
    prisma.loan.count({
      where: { status: { not: "COMPLETE_RETURN" } },
    }),
    prisma.product.findMany({
      where: {
        expirationDate: { lte: expiryThreshold },
        active: true,
      },
      orderBy: { expirationDate: "asc" },
      take: 5,
    }),
    prisma.financialPeriod.findFirst({
      where: { status: "CLOSED", totalSales: { gt: 0 } },
      orderBy: { endDate: "desc" },
    }),
    prisma.user.findFirst({ where: { role: "ADMIN" } }),
  ]);

  const financialPreview = admin
    ? await calculateFinancialPeriod({
        startDate: weekStart,
        endDate: new Date(),
        totalSales: latestPeriod?.totalSales ?? 0,
        targetFullCostPercent: latestPeriod?.targetFullCostPercent ?? 30,
        responsibleName: "Dashboard",
        userId: admin.id,
      }).catch(() => null)
    : null;

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
    lowStockCount: stocks.filter((s) => s.quantity <= s.product.minQuantity)
      .length,
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
      weeklyAvgQuantity: usageResult.weeklyAvgQuantity,
      weeklyAvgValue: usageResult.weeklyAvgValue,
      totalSuggestedCost: usageResult.totalSuggestedCost,
      urgentCount: usageResult.urgentCount,
      topSuggestions: usageResult.purchaseSuggestions.slice(0, 3),
    },
    mostUsed: usageResult.fastMovers.slice(0, 5),
  };
}
