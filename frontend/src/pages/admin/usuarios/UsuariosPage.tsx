import type { ColumnDef } from '@tanstack/react-table';
import { useUsuarios } from '../../../hooks/useUsuarios';
import { type Usuario } from '../../../services/usuarios.service';
import { DataTable } from '../../../components/table/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';

const usuarioColumns: ColumnDef<Usuario>[] = [
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
    cell: ({ row }) => (
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.original.estado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
        {row.original.estado ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
];

export const UsuariosPage = () => {
  const { data = [], isLoading, isError } = useUsuarios();

  if (isLoading) {
    return <StateMessage title="Cargando usuarios" description="Estamos obteniendo el equipo operativo." />;
  }

  if (isError) {
    return (
      <StateMessage
        title="Usuarios aún no está conectado"
        description="El frontend ya está preparado, pero falta crear el endpoint /api/usuarios en el backend."
      />
    );
  }

  return (
    <section>
      <PageHeader title="Usuarios" description="Administra las personas que operan el sistema y sus roles." />
      <DataTable columns={usuarioColumns} data={data} searchPlaceholder="Buscar usuario..." emptyMessage="No hay usuarios registrados" />
    </section>
  );
};
