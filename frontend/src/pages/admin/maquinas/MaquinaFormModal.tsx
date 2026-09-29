import type { FormEvent } from 'react';
import { FormActions } from '../../../components/forms/FormActions';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { Modal } from '../../../components/Modal';
import type { EstadoMaquina, Maquina } from '../../../services/maquinas.service';
import type { MaquinaForm } from './maquinas.mapper';

type MaquinaFormModalProps = {
  form: MaquinaForm;
  editingMaquina: Maquina | null;
  isSaving: boolean;
  onChange: (form: MaquinaForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const estadoOptions = [
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'INACTIVA', label: 'Inactiva' },
  { value: 'MANTENCION', label: 'Mantención' },
];

export const MaquinaFormModal = ({ form, editingMaquina, isSaving, onChange, onSubmit, onClose }: MaquinaFormModalProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Modal title={editingMaquina ? 'Editar máquina' : 'Nueva máquina'} description="Completa los datos operativos de la máquina." onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Código" required value={form.codigo} onChange={(codigo) => onChange({ ...form, codigo })} />
        <TextField label="Nombre" required value={form.nombre} onChange={(nombre) => onChange({ ...form, nombre })} />
        <TextField label="Ubicación" required value={form.ubicacion} onChange={(ubicacion) => onChange({ ...form, ubicacion })} className="sm:col-span-2" />
        <SelectField label="Estado" value={form.estado} options={estadoOptions} onChange={(estado) => onChange({ ...form, estado: estado as EstadoMaquina })} />
        <TextField label="Descripción" required rows={3} value={form.descripcion} onChange={(descripcion) => onChange({ ...form, descripcion })} className="sm:col-span-2" />
        <FormActions submitLabel={editingMaquina ? 'Guardar cambios' : 'Crear máquina'} isSubmitting={isSaving} onCancel={onClose} />
      </form>
    </Modal>
  );
};
