import type { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { useUsuarios } from '../../../hooks/useUsuarios';
import { usuariosService, type Usuario, type CreateUsuarioDTO, type UpdateUsuarioDTO } from '../../../services/usuarios.service';
import { DataTable } from '../../../components/table/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { Modal } from '../../../components/Modal';
import { TextField } from '../../../components/forms/TextField';
import { SelectField } from '../../../components/forms/SelectField';
import { FormActions } from '../../../components/forms/FormActions';
import { RowActions } from '../../../components/table/RowActions';
import { StatusBadge } from '../../../components/ui/StatusBadge';

const usuarioColumns: ColumnDef<Usuario>[] = [
  {
    accessorKey: 'apellido',
    header: 'Apellido',
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'rol',
    header: 'Rol',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge active={row.original.estado} />,
  },
];

const emptyForm = { nombre: '', apellido: '', email: '', rol: 'REPONEDOR', estado: 'true' };

export const UsuariosPage = () => {
  const usuarios = useUsuarios();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const mutationLock = useRef(false);
  const refreshUsuarios = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
    queryClient.invalidateQueries({ queryKey: ['camionetas'] }),
    queryClient.invalidateQueries({ queryKey: ['camioneta'] }),
  ]);
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: CreateUsuarioDTO & UpdateUsuarioDTO }) => (
      id === undefined ? usuariosService.create(payload) : usuariosService.update(id, payload)
    ),
    onSuccess: async () => {
      setIsModalOpen(false);
      await refreshUsuarios();
    },
    onSettled: () => { mutationLock.current = false; },
  });
  const deleteMutation = useMutation({
    mutationFn: usuariosService.delete,
    onSuccess: refreshUsuarios,
    onSettled: () => { mutationLock.current = false; },
  });
  const isPending = saveMutation.isPending || deleteMutation.isPending;
  const closeModal = () => {
    if (!mutationLock.current) setIsModalOpen(false);
  };
  const openModal = (usuario: Usuario | null = null) => {
    if (mutationLock.current) return;
    saveMutation.reset();
    deleteMutation.reset();
    setFormError('');
    setEditing(usuario);
    setForm(usuario ? { nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol: usuario.rol, estado: String(usuario.estado) } : emptyForm);
    setIsModalOpen(true);
  };
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationLock.current) return;
    if (!form.nombre.trim() || !form.apellido.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Completa nombre, apellido y un email valido.');
      return;
    }
    setFormError('');
    mutationLock.current = true;
    saveMutation.mutate({
      id: editing?.id_usuario,
      payload: {
        nombre: form.nombre.trim(), apellido: form.apellido.trim(), email: form.email.trim(), rol: form.rol,
        ...(editing ? { estado: form.estado === 'true' } : {}),
      },
    });
  };
  const deleteUsuario = (usuario: Usuario) => {
    if (mutationLock.current || isModalOpen || !window.confirm(`Eliminar a ${usuario.nombre} ${usuario.apellido}? Si tiene historial, debes desactivarlo.`)) return;
    deleteMutation.reset();
    mutationLock.current = true;
    deleteMutation.mutate(usuario.id_usuario);
  };
  const columns: ColumnDef<Usuario>[] = [...usuarioColumns, {
    id: 'acciones', header: 'Acciones', enableSorting: false,
    cell: ({ row }) => <fieldset disabled={isPending}><RowActions onEdit={() => openModal(row.original)} onDelete={() => deleteUsuario(row.original)} /></fieldset>,
  }];

  if (usuarios.isLoading) {
    return <StateMessage title="Cargando usuarios" description="Estamos obteniendo el equipo operativo." />;
  }

  if (usuarios.isError) {
    return (
      <StateMessage
        title="No se pudieron cargar los usuarios"
        description={usuarios.error.message}
      />
    );
  }

  return (
    <section>
      <PageHeader title="Usuarios y repartidores" description="Gestiona reponedores y administradores. No se requiere login en este MVP." actions={<button type="button" onClick={() => openModal()} disabled={isPending} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">Nuevo usuario</button>} />
      {deleteMutation.isError ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{deleteMutation.error.message}</p> : null}
      {saveMutation.isSuccess || deleteMutation.isSuccess ? <p role="status" className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">Usuario actualizado correctamente.</p> : null}
      <DataTable columns={columns} data={usuarios.data ?? []} searchPlaceholder="Buscar usuario o repartidor..." emptyMessage="No hay usuarios registrados" />
      {isModalOpen ? <Modal title={editing ? 'Editar usuario' : 'Nuevo usuario'} description="Para un repartidor selecciona el rol REPONEDOR. Los nuevos usuarios se crean activos." onClose={closeModal}>
        <form onSubmit={submitForm}>
          <fieldset disabled={isPending} className="grid gap-4 sm:grid-cols-2">
            <TextField label="Nombre" required value={form.nombre} onChange={(nombre) => setForm({ ...form, nombre })} />
            <TextField label="Apellido" required value={form.apellido} onChange={(apellido) => setForm({ ...form, apellido })} />
            <TextField label="Email" required value={form.email} onChange={(email) => setForm({ ...form, email })} className="sm:col-span-2" />
            <SelectField label="Rol" value={form.rol} options={[{ value: 'REPONEDOR', label: 'REPONEDOR (repartidor)' }, { value: 'ADMIN', label: 'ADMIN (bodeguero)' }]} onChange={(rol) => setForm({ ...form, rol })} />
            {editing ? <SelectField label="Estado" value={form.estado} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(estado) => setForm({ ...form, estado })} /> : null}
            {formError || saveMutation.isError ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{formError || saveMutation.error?.message}</p> : null}
            <FormActions submitLabel={saveMutation.isPending ? 'Guardando...' : 'Guardar usuario'} isSubmitting={isPending} onCancel={closeModal} />
          </fieldset>
        </form>
      </Modal> : null}
    </section>
  );
};
