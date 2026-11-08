import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Camioneta } from '../../../services/camionetas.service';
import { CamionetaFormModal } from './CamionetaFormModal';
import { useCamionetasCrud } from './useCamionetasCrud';

export const CamionetasPage = () => {
  const {
    camionetas,
    usuarios,
    isModalOpen,
    editing,
    form,
    setForm,
    formError,
    saveMutation,
    deleteMutation,
    isPending,
    availableUsers,
    options,
    currentUnavailable,
    canSave,
    openModal,
    closeModal,
    submitForm,
    deleteCamioneta,
  } = useCamionetasCrud();

  const columns: ColumnDef<Camioneta>[] = [
    { accessorKey: 'patente', header: 'Patente' },
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      id: 'repartidor',
      header: 'Repartidor',
      accessorFn: (camioneta) => `${camioneta.repartidor_nombre} ${camioneta.repartidor_apellido}`.trim(),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge active={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => (
        <fieldset disabled={isPending} className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/camionetas/${row.original.id_camioneta}/inventario`}>Inventario</Link>
          </Button>
          <RowActions onEdit={() => openModal(row.original)} onDelete={() => deleteCamioneta(row.original)} />
        </fieldset>
      ),
    },
  ];

  const usersMessage = usuarios.isLoading ? (
    <p role="status" className="mb-4 text-sm text-slate-600">
      Cargando usuarios para asignar repartidores...
    </p>
  ) : usuarios.isError ? (
    <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <p>No se pudieron cargar los usuarios: {usuarios.error.message}. No se puede guardar.</p>
      <Button
        type="button"
        onClick={() => void usuarios.refetch()}
        disabled={usuarios.isFetching || isPending}
        variant="link"
        className="mt-2"
      >
        Reintentar
      </Button>
    </div>
  ) : !usuarios.data?.length ? (
    <p role="status" className="mb-4 text-sm text-amber-700">
      No hay usuarios registrados. Se necesita un REPONEDOR activo para guardar.
    </p>
  ) : availableUsers.length === 0 ? (
    <p role="status" className="mb-4 text-sm text-amber-700">
      No hay REPONEDORES activos disponibles. Pueden estar asignados a otras camionetas.
    </p>
  ) : null;

  return (
    <section>
      <PageHeader
        title="Camionetas"
        description="Administra los vehiculos y sus repartidores asignados."
        actions={
          <Button
            type="button"
            onClick={() => openModal()}
            disabled={isPending || !camionetas.isSuccess || camionetas.isError}
            variant="default"
          >
            Nueva camioneta
          </Button>
        }
      />
      {usersMessage}
      {deleteMutation.isPending ? (
        <p role="status" className="mb-4 text-sm text-slate-600">
          Eliminando camioneta...
        </p>
      ) : null}
      {deleteMutation.isError ? (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          No se pudo eliminar la camioneta: {deleteMutation.error.message}
        </p>
      ) : null}
      {camionetas.isLoading ? (
        <StateMessage title="Cargando camionetas" description="Obteniendo vehiculos y repartidores." />
      ) : camionetas.isError ? (
        <StateMessage title="No se pudieron cargar las camionetas" description={camionetas.error.message} />
      ) : (
        <DataTable
          columns={columns}
          data={camionetas.data ?? []}
          searchPlaceholder="Buscar camioneta o repartidor..."
          emptyMessage="No hay camionetas registradas."
        />
      )}
      {isModalOpen ? (
        <CamionetaFormModal
          editing={editing}
          form={form}
          isPending={isPending}
          isSaving={saveMutation.isPending}
          error={
            formError ||
            (saveMutation.isError
              ? `No se pudo guardar la camioneta: ${saveMutation.error?.message}`
              : undefined)
          }
          options={options}
          currentUnavailable={currentUnavailable}
          canSave={canSave}
          repartidorDisabled={!usuarios.isSuccess || usuarios.isError || camionetas.isError}
          onChange={setForm}
          onSubmit={submitForm}
          onClose={closeModal}
        >
          {usersMessage}
        </CamionetaFormModal>
      ) : null}
    </section>
  );
};
