import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import type { Usuario } from '../../../services/usuarios.service';
import { DataTable } from '../../../components/table/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { RowActions } from '../../../components/table/RowActions';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { UsuarioFormModal } from './UsuarioFormModal';
import { useUsuariosCrud } from './useUsuariosCrud';

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

export const UsuariosPage = () => {
  const {
    usuarios,
    isModalOpen,
    editing,
    form,
    setForm,
    formError,
    saveMutation,
    deleteMutation,
    isPending,
    closeModal,
    openModal,
    submitForm,
    deleteUsuario,
  } = useUsuariosCrud();

  const columns: ColumnDef<Usuario>[] = [
    ...usuarioColumns,
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      cell: ({ row }) => (
        <fieldset disabled={isPending}>
          <RowActions onEdit={() => openModal(row.original)} onDelete={() => deleteUsuario(row.original)} />
        </fieldset>
      ),
    },
  ];

  if (usuarios.isLoading) {
    return <StateMessage title="Cargando usuarios" description="Estamos obteniendo el equipo operativo." />;
  }

  if (usuarios.isError) {
    return <StateMessage title="No se pudieron cargar los usuarios" description={usuarios.error.message} />;
  }

  return (
    <section>
      <PageHeader
        title="Usuarios y repartidores"
        description="Administra el equipo y sus roles dentro de la operación."
        actions={
          <Button type="button" onClick={() => openModal()} disabled={isPending} variant="default">
            Nuevo usuario
          </Button>
        }
      />
      {deleteMutation.isError ? (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {deleteMutation.error.message}
        </p>
      ) : null}
      {saveMutation.isSuccess || deleteMutation.isSuccess ? (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Usuario actualizado correctamente.
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={usuarios.data ?? []}
        searchPlaceholder="Buscar usuario o repartidor..."
        emptyMessage="No hay usuarios registrados"
      />
      {isModalOpen ? (
        <UsuarioFormModal
          editing={Boolean(editing)}
          form={form}
          isPending={isPending}
          isSaving={saveMutation.isPending}
          error={formError || (saveMutation.isError ? saveMutation.error?.message : undefined)}
          onChange={setForm}
          onSubmit={submitForm}
          onClose={closeModal}
        />
      ) : null}
    </section>
  );
};
