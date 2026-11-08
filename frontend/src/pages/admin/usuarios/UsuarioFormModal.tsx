import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormEvent } from 'react';
import { Modal } from '../../../components/Modal';
import { TextField } from '../../../components/forms/TextField';
import { SelectField } from '../../../components/forms/SelectField';
import { FormActions } from '../../../components/forms/FormActions';
import type { UsuarioForm } from './useUsuariosCrud';

type Props = {
  editing: boolean;
  form: UsuarioForm;
  isPending: boolean;
  isSaving: boolean;
  error?: string;
  onChange: (form: UsuarioForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const UsuarioFormModal = ({
  editing,
  form,
  isPending,
  isSaving,
  error,
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
      title={editing ? 'Editar usuario' : 'Nuevo usuario'}
      description="Asigna el rol según las tareas del usuario. Los nuevos usuarios se crean activos."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isPending} className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre"
            required
            value={form.nombre}
            onChange={(nombre) => onChange({ ...form, nombre })}
          />
          <TextField
            label="Apellido"
            required
            value={form.apellido}
            onChange={(apellido) => onChange({ ...form, apellido })}
          />
          <TextField
            label="Email"
            required
            value={form.email}
            onChange={(email) => onChange({ ...form, email })}
            className="sm:col-span-2"
          />
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="usuario-password">{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label>
            <Input
              id="usuario-password"
              type="password"
              autoComplete="new-password"
              required={!editing}
              minLength={8}
              value={form.password}
              onChange={(event) => onChange({ ...form, password: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Al menos 8 caracteres; máximo 72 bytes.
              {editing ? ' Déjala vacía para conservar la actual. Al cambiarla se cierran sus sesiones.' : ''}
            </p>
          </div>
          <SelectField
            label="Rol"
            value={form.rol}
            options={[
              { value: 'REPONEDOR', label: 'REPONEDOR (repartidor)' },
              { value: 'BODEGUERO', label: 'BODEGUERO (operaciones de bodega)' },
              { value: 'ADMIN', label: 'ADMIN (administrador)' },
            ]}
            onChange={(rol) => onChange({ ...form, rol })}
          />
          {editing ? (
            <SelectField
              label="Estado"
              value={form.estado}
              options={[
                { value: 'true', label: 'Activo' },
                { value: 'false', label: 'Inactivo' },
              ]}
              onChange={(estado) => onChange({ ...form, estado })}
            />
          ) : null}
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          ) : null}
          <FormActions
            submitLabel={isSaving ? 'Guardando...' : 'Guardar usuario'}
            isSubmitting={isPending}
            onCancel={onClose}
          />
        </fieldset>
      </form>
    </Modal>
  );
};
