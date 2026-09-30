import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { camionetasService, type CamionetaProducto, type CamionetaMovimientoDetalle } from '../../../services/camionetas.service';

const inventarioColumns: ColumnDef<CamionetaProducto>[] = [
  { accessorKey: 'producto_nombre', header: 'Producto' },
  { accessorKey: 'stock_actual', header: 'Unidades en camioneta' },
  { accessorKey: 'estado', header: 'Estado', cell: ({ row }) => <StatusBadge active={row.original.estado} /> },
];
const dateFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' });
const movimientoColumns: ColumnDef<CamionetaMovimientoDetalle>[] = [
  { accessorKey: 'fecha_creacion', header: 'Fecha', cell: ({ row }) => dateFormatter.format(new Date(row.original.fecha_creacion)) },
  { accessorKey: 'producto_nombre', header: 'Producto' },
  { accessorKey: 'bodeguero_nombre', header: 'Bodeguero' },
  { accessorKey: 'repartidor_nombre', header: 'Repartidor' },
  { accessorKey: 'cantidad', header: 'Cantidad entregada' },
  { accessorKey: 'stock_final', header: 'Saldo final' },
  { accessorKey: 'observacion', header: 'Observacion', cell: ({ row }) => row.original.observacion || '-' },
];

export const CamionetaInventarioPage = () => {
  const params = useParams();
  const id = Number(params.id);
  const validId = Number.isSafeInteger(id) && id > 0;
  const camioneta = useQuery({ queryKey: ['camioneta', id], queryFn: () => camionetasService.getById(id), enabled: validId });
  const inventario = useQuery({ queryKey: ['camioneta-inventario', id], queryFn: () => camionetasService.getInventario(id), enabled: validId });
  const movimientos = useQuery({ queryKey: ['camioneta-movimientos', id], queryFn: () => camionetasService.getMovimientos(id), enabled: validId });

  return (
    <section>
      <PageHeader
        title={camioneta.isSuccess ? `Inventario: ${camioneta.data.nombre}` : 'Inventario de camioneta'}
        description={camioneta.isSuccess ? `${camioneta.data.patente} | Repartidor: ${camioneta.data.repartidor_nombre} ${camioneta.data.repartidor_apellido}` : 'Consulta el stock y el historial de entregas desde bodega.'}
        actions={<Link to="/admin/camionetas" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Volver a camionetas</Link>}
      />
      {!validId ? <StateMessage title="Camioneta no valida" description="El identificador de la camioneta no es valido." /> : camioneta.isLoading ? (
        <StateMessage title="Cargando camioneta" description="Obteniendo vehiculo y repartidor asignado." />
      ) : camioneta.isError ? (
        <StateMessage title="No se pudo cargar la camioneta" description={camioneta.error.message} />
      ) : (
        <>
          {inventario.isLoading ? <StateMessage title="Cargando inventario" description="Obteniendo saldos de la camioneta." /> : inventario.isError ? (
            <StateMessage title="No se pudo cargar el inventario" description={inventario.error.message} />
          ) : <DataTable columns={inventarioColumns} data={inventario.data ?? []} searchPlaceholder="Buscar producto en camioneta..." emptyMessage="No hay productos registrados." />}
          <h3 className="mb-4 mt-8 text-xl font-bold text-slate-950">Historial de entregas</h3>
          {movimientos.isLoading ? <StateMessage title="Cargando entregas" description="Obteniendo el historial de la camioneta." /> : movimientos.isError ? (
            <StateMessage title="No se pudieron cargar las entregas" description={movimientos.error.message} />
          ) : <DataTable columns={movimientoColumns} data={movimientos.data ?? []} searchPlaceholder="Buscar entrega..." emptyMessage="No hay entregas registradas." />}
        </>
      )}
    </section>
  );
};
