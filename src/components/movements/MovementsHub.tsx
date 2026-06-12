"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementForm } from "@/components/forms/MovementForm";
import { TransferForm } from "@/components/forms/TransferForm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatDate, formatRegisteredQuantity } from "@/lib/utils";
import { storeLocationLabel } from "@/lib/stores/default-location";

const TABS = [
  { id: "entry", label: "Entrada" },
  { id: "exit", label: "Salida" },
  { id: "transfer", label: "Transferencia" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type TransferRow = {
  id: string;
  quantity: number;
  registeredQuantity: number | null;
  registeredUnit: string | null;
  date: Date;
  product: { name: string; unit: string };
  fromLocation: { name: string; store?: { name: string } | null };
  toLocation: { name: string; store?: { name: string } | null };
  user: { name: string };
};

export function MovementsHub({
  recentTransfers,
}: {
  recentTransfers: TransferRow[];
}) {
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
          <Card className="mb-4 border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
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

      {tab === "transfer" ? (
        <>
          <div className="mb-8">
            <TransferForm />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Historial reciente</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {recentTransfers.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {t.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {storeLocationLabel(t.fromLocation)} →{" "}
                      {storeLocationLabel(t.toLocation)} · {t.user.name}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">
                      {formatRegisteredQuantity({
                        quantity: t.quantity,
                        registeredQuantity: t.registeredQuantity,
                        registeredUnit: t.registeredUnit,
                        fallbackUnit: t.product.unit,
                      })}
                    </span>
                    <span className="ml-2 text-slate-400">
                      {formatDate(t.date)}
                    </span>
                  </div>
                </div>
              ))}
              {recentTransfers.length === 0 && (
                <p className="text-sm text-slate-500">Sin transferencias aún</p>
              )}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
