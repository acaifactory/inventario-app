import { Button } from "@/components/ui/Button";
import { Download, Pencil, Printer } from "lucide-react";

export function RecordActions({
  onEdit,
  onPrint,
  onExport,
  editDisabled,
  editDisabledReason,
}: {
  onEdit: () => void;
  onPrint: () => void;
  onExport: () => void;
  editDisabled?: boolean;
  editDisabledReason?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onEdit}
        disabled={editDisabled}
        title={editDisabled ? editDisabledReason : undefined}
      >
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onPrint}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onExport}>
        <Download className="h-4 w-4" />
        Exportar
      </Button>
    </div>
  );
}
