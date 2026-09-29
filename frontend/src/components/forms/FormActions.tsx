type FormActionsProps = {
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
};

export const FormActions = ({ submitLabel, isSubmitting = false, onCancel }: FormActionsProps) => {
  return (
    <div className="flex justify-end gap-2 sm:col-span-2">
      <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        Cancelar
      </button>
      <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
        {submitLabel}
      </button>
    </div>
  );
};
