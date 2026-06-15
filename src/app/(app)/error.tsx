"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold text-slate-900">
        No se pudo cargar la página
      </h2>
      <p className="max-w-md text-sm text-slate-500">
        Puede ser un problema temporal con la base de datos. Espera unos
        segundos e intenta de nuevo.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => reset()}>Reintentar</Button>
        <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
