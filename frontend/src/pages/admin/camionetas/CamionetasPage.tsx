import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FormActions } from '../../../components/forms/FormActions';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { Modal } from '../../../components/Modal';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { camionetasService, type Camioneta, type CamionetaPayload } from '../../../services/camionetas.service';
import { usuariosService } from '../../../services/usuarios.service';

const emptyForm = { patente: '', nombre: '', id_repartidor: '', estado: 'true' };

export const CamionetasPage = () => {
  const queryClient = useQueryClient();
  const camionetas = useQuery({ queryKey: ['camionetas'], queryFn: camionetasService.getAll });
  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: usuariosService.getAll, retry: false });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Camioneta | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const mutationLock = useRef(false);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: CamionetaPayload }) => (
      id === undefined ? camionetasService.create(payload) : camionetasService.update(id, payload)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['camionetas'] });
      setIsModalOpen(false);
    },
    onSettled: () => { mutationLock.current = false; },
  });
  const deleteMutation = useMutation({
    mutationFn: camionetasService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['camionetas'] }),
    onSettled: () => { mutationLock.current = false; },
  });
  const isPending = saveMutation.isPending || deleteMutation.isPending;

  const assignedIds = new Set(
    (camionetas.data ?? [])
      .filter((camioneta) => camioneta.id_camioneta !== editing?.id_camioneta)
      .map((camioneta) => camioneta.id_repartidor),
  );
  const availableUsers = (usuarios.data ?? []).filter(
    (usuario) => usuario.estado && usuario.rol === 'REPONEDOR' && !assignedIds.has(usuario.id_usuario),
  );
  const selectedUser = availableUsers.find((usuario) => usuario.id_usuario === Number(form.id_repartidor));
  const options = availableUsers.map((usuario) => ({
    value: usuario.id_usuario,
    label: `${usuario.nombre} ${usuario.apellido}`.trim(),
  }));
  const currentUnavailable = editing !== null && !availableUsers.some((usuario) => usuario.id_usuario === editing.id_repartidor);
  if (currentUnavailable) {
    options.unshift({
      value: editing.id_repartidor,
      label: `${editing.repartidor_nombre} ${editing.repartidor_apellido} (actual, no disponible)`.trim(),
    });
  }
  const canSave = usuarios.isSuccess && !usuarios.isError && camionetas.isSuccess && !camionetas.isError
    && !!selectedUser && !!form.patente.trim() && !!form.nombre.trim();

  const openModal = (camioneta: Camioneta | null = null) => {
    if (mutationLock.current) return;
    saveMutation.reset();
    deleteMutation.reset();
    setFormError('');
    setEditing(camioneta);
    setForm(camioneta ? {
      patente: camioneta.patente,
      nombre: camioneta.nombre,
      id_repartidor: String(camioneta.id_repartidor),
      estado: String(camioneta.estado),
    } : emptyForm);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    if (!mutationLock.current && !isPending) setIsModalOpen(false);
  };
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationLock.current || isPending) return;
    if (!canSave || !selectedUser) {
      setFormError('Completa los campos y selecciona un REPONEDOR activo y disponible. Los usuarios y camionetas deben cargarse correctamente.');
      return;
    }
    setFormError('');
    mutationLock.current = true;
    saveMutation.mutate({
      id: editing?.id_camioneta,
      payload: {
        patente: form.patente.trim(),
        nombre: form.nombre.trim(),
        id_repartidor: selectedUser.id_usuario,
        estado: form.estado === 'true',
      },
    });
  };
  const deleteCamioneta = (camioneta: Camioneta) => {
    if (mutationLock.current || isPending || isModalOpen) return;
    if (!window.confirm(`Eliminar la camioneta "${camioneta.nombre}" (${camioneta.patente})?`)) return;
    deleteMutation.reset();
    mutationLock.current = true;
    deleteMutation.mutate(camioneta.id_camioneta);
  };

  const columns: ColumnDef<Camioneta>[] = [
    { accessorKey: 'patente', header: 'Patente' },
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      id: 'repartidor',
      header: 'Repartidor',
      accessorFn: (camioneta) => `${camioneta.repartidor_nombre} ${camioneta.repartidor_apellido}`.trim(),
    },
    { accessorKey: 'estado', header: 'Estado', cell: ({ row }) => <StatusBadge active={row.original.estado} /> },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => (
        <fieldset disabled={isPending} className="flex items-center gap-2">
          <Link to={`/admin/camionetas/${row.original.id_camioneta}/inventario`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Inventario</Link>
          <RowActions onEdit={() => openModal(row.original)} onDelete={() => deleteCamioneta(row.original)} />
        </fieldset>
      ),
    },
  ];

  const usersMessage = usuarios.isLoading ? (
    <p role="status" className="mb-4 text-sm text-slate-600">Cargando usuarios para asignar repartidores...</p>
  ) : usuarios.isError ? (
    <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
      <p>No se pudieron cargar los usuarios: {usuarios.error.message}. No se puede guardar.</p>
      <button type="button" onClick={() => void usuarios.refetch()} disabled={usuarios.isFetching || isPending} className="mt-2 font-semibold underline">Reintentar</button>
    </div>
  ) : !usuarios.data?.length ? (
    <p role="status" className="mb-4 text-sm text-amber-700">No hay usuarios registrados. Se necesita un REPONEDOR activo para guardar.</p>
  ) : availableUsers.length === 0 ? (
    <p role="status" className="mb-4 text-sm text-amber-700">No hay REPONEDORES activos disponibles. Pueden estar asignados a otras camionetas.</p>
  ) : null;

  return (
    <section>
      <PageHeader
        title="Camionetas"
        description="Administra los vehiculos y sus repartidores asignados."
        actions={(
          <button type="button" onClick={() => openModal()} disabled={isPending || !camionetas.isSuccess || camionetas.isError} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
            Nueva camioneta
          </button>
        )}
      />
      {usersMessage}
      {deleteMutation.isPending ? <p role="status" className="mb-4 text-sm text-slate-600">Eliminando camioneta...</p> : null}
      {deleteMutation.isError ? <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">No se pudo eliminar la camioneta: {deleteMutation.error.message}</p> : null}
      {camionetas.isLoading ? (
        <StateMessage title="Cargando camionetas" description="Obteniendo vehiculos y repartidores." />
      ) : camionetas.isError ? (
        <StateMessage title="No se pudieron cargar las camionetas" description={camionetas.error.message} />
      ) : (
        <DataTable columns={columns} data={camionetas.data ?? []} searchPlaceholder="Buscar camioneta o repartidor..." emptyMessage="No hay camionetas registradas." />
      )}
      {isModalOpen ? (
        <Modal title={editing ? 'Editar camioneta' : 'Nueva camioneta'} description="Asigna un REPONEDOR activo que no tenga otra camioneta." onClose={closeModal}>
          {usersMessage}
          <form onSubmit={submitForm}>
            <fieldset disabled={isPending} className="grid gap-4 sm:grid-cols-2">
              <TextField label="Patente" required value={form.patente} onChange={(patente) => setForm({ ...form, patente })} />
              <TextField label="Nombre" required value={form.nombre} onChange={(nombre) => setForm({ ...form, nombre })} />
              <SelectField
                label="Repartidor"
                required
                value={form.id_repartidor}
                options={options}
                placeholder="Selecciona un repartidor"
                disabled={!usuarios.isSuccess || usuarios.isError || camionetas.isError}
                onChange={(id_repartidor) => setForm({ ...form, id_repartidor })}
                hint={currentUnavailable && form.id_repartidor === String(editing.id_repartidor) ? 'La asignacion actual ya no es valida. Selecciona un REPONEDOR activo y disponible antes de guardar.' : undefined}
              />
              <SelectField label="Estado" value={form.estado} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(estado) => setForm({ ...form, estado })} />
              {formError || saveMutation.isError ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{formError || `No se pudo guardar la camioneta: ${saveMutation.error?.message}`}</p> : null}
              <FormActions submitLabel={saveMutation.isPending ? 'Guardando...' : 'Guardar camioneta'} isSubmitting={isPending || !canSave} onCancel={closeModal} />
            </fieldset>
          </form>
        </Modal>
      ) : null}
    </section>
  );
};
