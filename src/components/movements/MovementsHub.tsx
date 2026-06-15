"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementForm } from "@/components/forms/MovementForm";
import { TransferForm } from "@/components/forms/TransferForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "entry", label: "Entrada" },
  { id: "exit", label: "Salida" },
  { id: "transfer", label: "Transferencia" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MovementsHub() {
  const params = useSearchParams();
  const tab = (params.get("tab") as TabId) || "entry";

  return (
    <div>
      <PageHeader
        title="Centro de movimientos"
        description="Entradas, salidas y transferencias en un solo lugar"
        action={
          <Link href="/loans">
            <Button variant="outline">Préstamos y devoluciones</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.id} href={`/movements?tab=${t.id}`}>
            <button
              type="button"
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {t.label}
            </button>
          </Link>
        ))}
      </div>

      {tab === "entry" ? (
        <>
          <Card className="mb-4 max-w-2xl border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
            ¿Factura con varios productos? Usa{" "}
            <Link href="/purchases" className="font-semibold underline">
              Compras → Facturas
            </Link>{" "}
            para registrar todo en un solo paso.
          </Card>
          <MovementForm type="entry" />
        </>
      ) : null}

      {tab === "exit" ? <MovementForm type="exit" /> : null}

      {tab === "transfer" ? <TransferForm /> : null}
    </div>
  );
}
