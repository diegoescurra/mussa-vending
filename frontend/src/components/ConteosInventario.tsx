import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { conteosService, type ConteoDetalle } from '../services/conteos.service';
import { StateMessage } from './StateMessage';
import { DataTable } from './table/DataTable';

const dateFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' });
const columns: ColumnDef<ConteoDetalle>[] = [
  { accessorKey: 'fecha_creacion', header: 'Fecha', cell: ({ row }) => dateFormatter.format(new Date(row.original.fecha_creacion)) },
  { accessorKey: 'producto_nombre', header: 'Producto' },
  { accessorKey: 'responsable_nombre', header: 'Responsable' },
  { accessorKey: 'stock_esperado', header: 'Esperado' },
  { accessorKey: 'stock_fisico', header: 'Fisico' },
  { accessorKey: 'diferencia', header: 'Diferencia', cell: ({ row }) => {
    const diferencia = row.original.diferencia;
    return `${diferencia > 0 ? '+' : ''}${diferencia} (${diferencia < 0 ? 'Faltante' : diferencia > 0 ? 'Sobrante' : 'Coincide'})`;
  } },
  { accessorKey: 'observacion', header: 'Observacion', cell: ({ row }) => row.original.observacion || '-' },
];

export const ConteosInventario = ({ idCamioneta }: { idCamioneta?: number }) => {
  const conteos = useQuery({ queryKey: ['conteos', idCamioneta ?? 'central'], queryFn: () => conteosService.getAll(idCamioneta) });
  return (
    <>
      <h3 className="mb-2 mt-8 text-xl font-bold text-slate-950">Historial de conteos fisicos</h3>
      <p className="mb-4 text-sm text-slate-600">Los conteos no ajustan stock automaticamente ni crean movimientos.</p>
      {conteos.isLoading ? <StateMessage title="Cargando conteos" description="Obteniendo el historial de auditoria." /> : conteos.isError ? (
        <StateMessage title="No se pudieron cargar los conteos" description={conteos.error.message} />
      ) : <DataTable columns={columns} data={conteos.data ?? []} searchPlaceholder="Buscar conteo..." emptyMessage="No hay conteos registrados." />}
    </>
  );
};
