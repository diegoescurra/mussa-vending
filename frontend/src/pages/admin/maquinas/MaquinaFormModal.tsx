import type { FormEvent } from 'react';
import { FormActions } from '../../../components/forms/FormActions';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { Modal } from '../../../components/Modal';
import { sistemasPagoOptions, type EstadoMaquina, type Maquina } from '../../../services/maquinas.service';
import type { MaquinaForm } from './maquinas.mapper';
import type { MaquinaFormErrors } from './maquinas.validation';

type MaquinaFormModalProps = {
  form: MaquinaForm;
  editingMaquina: Maquina | null;
  isSaving: boolean;
  errors: MaquinaFormErrors;
  saveError: Error | null;
  onChange: (form: MaquinaForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const estadoOptions = [
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'INACTIVA', label: 'Inactiva' },
  { value: 'MANTENCION', label: 'Mantención' },
];

export const MaquinaFormModal = ({ form, editingMaquina, isSaving, errors, saveError, onChange, onSubmit, onClose }: MaquinaFormModalProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Modal title={editingMaquina ? 'Editar máquina' : 'Nueva máquina'} description="Completa los datos operativos de la máquina." onClose={() => { if (!isSaving) onClose(); }}>
      <form noValidate onSubmit={handleSubmit} className="grid gap-4">
        <fieldset disabled={isSaving} className="grid gap-4 sm:grid-cols-2">
          <TextField label="Código" required error={errors.codigo} value={form.codigo} onChange={(codigo) => onChange({ ...form, codigo })} />
          <TextField label="Nombre" required error={errors.nombre} value={form.nombre} onChange={(nombre) => onChange({ ...form, nombre })} />
          <TextField label="Modelo" required error={errors.modelo} value={form.modelo} onChange={(modelo) => onChange({ ...form, modelo })} />
          <SelectField label="Estado" error={errors.estado} value={form.estado} options={estadoOptions} onChange={(estado) => onChange({ ...form, estado: estado as EstadoMaquina })} />
          <fieldset className="sm:col-span-2" aria-describedby={errors.sistemas_pago ? 'maquina-pagos-error' : 'maquina-pagos-hint'}>
            <legend className="text-sm font-semibold text-slate-700">Sistemas de pago</legend>
            <p id="maquina-pagos-hint" className="mt-1 text-sm text-slate-500">Selecciona al menos uno. Puedes marcar varias opciones.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {sistemasPagoOptions.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.sistemas_pago.includes(value)} aria-invalid={Boolean(errors.sistemas_pago)} aria-describedby={errors.sistemas_pago ? 'maquina-pagos-error' : undefined}
                    onChange={(event) => onChange({ ...form, sistemas_pago: event.target.checked ? [...form.sistemas_pago, value] : form.sistemas_pago.filter((pago) => pago !== value) })}
                    className="h-4 w-4 accent-blue-600" />
                  {label}
                </label>
              ))}
            </div>
            {errors.sistemas_pago ? <p id="maquina-pagos-error" className="mt-2 text-sm text-red-700">{errors.sistemas_pago}</p> : null}
          </fieldset>
          <TextField label="Ubicación" required error={errors.ubicacion} value={form.ubicacion} onChange={(ubicacion) => onChange({ ...form, ubicacion })} className="sm:col-span-2" />
          <TextField label="Descripción" required error={errors.descripcion} rows={3} value={form.descripcion} onChange={(descripcion) => onChange({ ...form, descripcion })} className="sm:col-span-2" />
        </fieldset>
        {saveError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{saveError.message}</p> : null}
        <FormActions submitLabel={editingMaquina ? 'Guardar cambios' : 'Crear máquina'} isSubmitting={isSaving} onCancel={onClose} />
      </form>
    </Modal>
  );
};
