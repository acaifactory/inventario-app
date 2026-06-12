import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getValuationSummary } from "./valuation";
import { calculateFinancialPeriod } from "./financial-analysis";

export async function createWeeklySnapshot(
  storeId?: string,
  totalSales = 0,
  targetFullCostPercent = 30
) {
  const ref = subWeeks(new Date(), 1);
  const weekStart = startOfWeek(ref, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(ref, { weekStartsOn: 1 });

  const existing = await prisma.weeklySnapshot.findFirst({
    where: { weekStart, storeId: storeId ?? null },
  });
  if (existing) return existing;

  const valuation = await getValuationSummary(undefined, storeId);
  const financial = await calculateFinancialPeriod({
    startDate: weekStart,
    endDate: weekEnd,
    totalSales,
    targetFullCostPercent,
    responsibleName: "Sistema — cierre semanal",
    userId: (await prisma.user.findFirst({ where: { role: "ADMIN" } }))!.id,
    storeId,
  });

  return prisma.weeklySnapshot.create({
    data: {
      weekStart,
      weekEnd,
      storeId,
      inventoryValue: valuation.totalValue,
      foodCostValue: valuation.foodCostValue,
      packagingCostValue: valuation.packagingCostValue,
      costOfSales: financial.costOfSales,
      totalSales,
      fullCostPercent: financial.actualFullCostPercent,
      targetFullCostPercent,
      opportunityDollars: financial.opportunityDollars,
      payload: JSON.stringify({ valuation, financial }),
    },
  });
}
