import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
type FormActionsProps = { submitLabel: string; isSubmitting?: boolean; onCancel: () => void };
export function FormActions({ submitLabel, isSubmitting = false, onCancel }: FormActionsProps) {
  return (
    <div className="mt-2 flex justify-end gap-2 border-t pt-5 sm:col-span-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {submitLabel.endsWith('...') ? <Loader2 className="animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
