import type { FormEvent, ReactNode } from 'react';
import type { Camioneta } from '../../../services/camionetas.service';
import { Modal } from '../../../components/Modal';
import { TextField } from '../../../components/forms/TextField';
import { SelectField } from '../../../components/forms/SelectField';
import { FormActions } from '../../../components/forms/FormActions';
import type { CamionetaForm } from './useCamionetasCrud';

type Props = {
  editing: Camioneta | null;
  form: CamionetaForm;
  isPending: boolean;
  isSaving: boolean;
  error?: string;
  options: Array<{ value: number; label: string }>;
  currentUnavailable: boolean;
  canSave: boolean;
  repartidorDisabled: boolean;
  children: ReactNode;
  onChange: (form: CamionetaForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const CamionetaFormModal = ({
  editing,
  form,
  isPending,
  isSaving,
  error,
  options,
  currentUnavailable,
  canSave,
  repartidorDisabled,
  children,
  onChange,
  onSubmit,
  onClose,
}: Props) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Modal
      title={editing ? 'Editar camioneta' : 'Nueva camioneta'}
      description="Asigna un REPONEDOR activo que no tenga otra camioneta."
      onClose={onClose}
    >
      {children}
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isPending} className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Patente"
            required
            value={form.patente}
            onChange={(patente) => onChange({ ...form, patente })}
          />
          <TextField
            label="Nombre"
            required
            value={form.nombre}
            onChange={(nombre) => onChange({ ...form, nombre })}
          />
          <SelectField
            label="Repartidor"
            required
            value={form.id_repartidor}
            options={options}
            placeholder="Selecciona un repartidor"
            disabled={repartidorDisabled}
            onChange={(id_repartidor) => onChange({ ...form, id_repartidor })}
            hint={
              currentUnavailable && form.id_repartidor === String(editing?.id_repartidor)
                ? 'La asignacion actual ya no es valida. Selecciona un REPONEDOR activo y disponible antes de guardar.'
                : undefined
            }
          />
          <SelectField
            label="Estado"
            value={form.estado}
            options={[
              { value: 'true', label: 'Activo' },
              { value: 'false', label: 'Inactivo' },
            ]}
            onChange={(estado) => onChange({ ...form, estado })}
          />
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          ) : null}
          <FormActions
            submitLabel={isSaving ? 'Guardando...' : 'Guardar camioneta'}
            isSubmitting={isPending || !canSave}
            onCancel={onClose}
          />
        </fieldset>
      </form>
    </Modal>
  );
};
