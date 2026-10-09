import { useState, type FormEvent } from 'react';
import { Modal } from '../../../components/Modal';
import { TextField } from '../../../components/forms/TextField';
import { SelectField } from '../../../components/forms/SelectField';
import { FormActions } from '../../../components/forms/FormActions';
import { validateProveedorForm, type ProveedorForm } from './proveedores.validation';

type Props = {
  form: ProveedorForm;
  editing: boolean;
  isSaving: boolean;
  saveError?: string;
  onChange: (form: ProveedorForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const ProveedorFormModal = ({ form, editing, isSaving, saveError, onChange, onSubmit, onClose }: Props) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const errors = hasSubmitted ? validateProveedorForm(form, editing) : {};
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setHasSubmitted(true);
    if (Object.keys(validateProveedorForm(form, editing)).length) return;
    onSubmit();
  };
  return (
    <Modal title={editing ? 'Editar proveedor' : 'Nuevo proveedor'} description="Los proveedores inactivos no se ofrecen para nuevas asignaciones de productos." onClose={onClose} closeDisabled={isSaving}>
      <form noValidate onSubmit={submit}>
        {saveError ? <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{saveError}</p> : null}
        <fieldset disabled={isSaving} aria-busy={isSaving} className="grid min-w-0 gap-4">
          <TextField label="Nombre" required value={form.nombre} error={errors.nombre} onChange={(nombre) => onChange({ ...form, nombre })} />
          {editing ? <SelectField label="Estado" required value={form.estado} error={errors.estado} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(estado) => onChange({ ...form, estado })} /> : null}
          <FormActions submitLabel={isSaving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear proveedor'} isSubmitting={isSaving} onCancel={onClose} />
        </fieldset>
      </form>
    </Modal>
  );
};
