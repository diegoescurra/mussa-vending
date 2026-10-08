type RowActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
};

export const RowActions = ({ onEdit, onDelete, deleteDisabled = false }: RowActionsProps) => {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onEdit} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
        Editar
      </button>
      <button type="button" onClick={onDelete} disabled={deleteDisabled} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
        Eliminar
      </button>
    </div>
  );
};
