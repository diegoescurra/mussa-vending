type RowActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
};

export const RowActions = ({ onEdit, onDelete }: RowActionsProps) => {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onEdit} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
        Editar
      </button>
      <button type="button" onClick={onDelete} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50">
        Eliminar
      </button>
    </div>
  );
};
