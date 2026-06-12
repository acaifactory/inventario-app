import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { getValuationSummary } from "@/lib/inventory/valuation";
import { prisma } from "@/lib/prisma";
import { DollarSign, PieChart, TrendingUp, Receipt } from "lucide-react";

export default async function FinancesPage() {
  const valuation = await getValuationSummary();
  const latestPeriod = await prisma.financialPeriod.findFirst({
    where: { status: "CLOSED" },
    orderBy: { endDate: "desc" },
  });

  const cards = [
    {
      href: "/food-cost",
      title: "Food Cost / Full Cost",
      description: "Cost of Sales, objetivo y oportunidad",
      value: latestPeriod
        ? `${(latestPeriod.actualFullCostPercent ?? 0).toFixed(1)}%`
        : "Calcular",
      icon: TrendingUp,
      color: "text-violet-600 bg-violet-50",
    },
    {
      href: "/valuation",
      title: "Valorización",
      description: "Inventario por clasificación financiera",
      value: formatCurrency(valuation.cogsValue),
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      href: "/valuation",
      title: "Food Cost (stock)",
      description: "Valor actual ingredientes",
      value: formatCurrency(valuation.foodCostValue),
      icon: PieChart,
      color: "text-sky-600 bg-sky-50",
    },
    {
      href: "/valuation",
      title: "Packaging Cost",
      description: "Empaques en inventario",
      value: formatCurrency(valuation.packagingCostValue),
      icon: Receipt,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Finanzas"
        description="Food Cost, Packaging, Full Cost y valorización"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{card.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{card.description}</p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
