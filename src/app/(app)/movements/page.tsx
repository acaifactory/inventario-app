import { Suspense } from "react";
import { MovementsHub } from "@/components/movements/MovementsHub";

export default function MovementsPage() {
  return (
    <Suspense fallback={<div>Cargando…</div>}>
      <MovementsHub />
    </Suspense>
  );
}
