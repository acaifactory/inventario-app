import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { MovementsHub } from "@/components/movements/MovementsHub";

export default async function MovementsPage() {
  const recentTransfers = await prisma.transfer.findMany({
    orderBy: { date: "desc" },
    take: 20,
    include: {
      product: true,
      fromLocation: { include: { store: true } },
      toLocation: { include: { store: true } },
      user: { select: { name: true } },
    },
  });

  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <MovementsHub recentTransfers={recentTransfers} />
    </Suspense>
  );
}
