import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
type RowActionsProps = { onEdit: () => void; onDelete: () => void; deleteDisabled?: boolean };
export function RowActions({ onEdit, onDelete, deleteDisabled = false }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onEdit}
        aria-label="Editar"
        title="Editar"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={deleteDisabled}
        aria-label="Eliminar"
        title="Eliminar"
        className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
