import { Link } from 'react-router-dom';
import { DataTable } from '@/components/table/DataTable';
import { Badge } from '@/components/ui/badge';
import { MoneyText } from '@/components/ui/MoneyText';
import type { Dashboard } from '@/services/dashboard.service';
import { formatDate } from './dashboardPresentation';
function Heading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
export function AttentionPanel({ data }: { data: Dashboard }) {
  return (
    <section>
      <Heading
        title="Reposiciones prioritarias"
        description="Stock actual de máquinas activas: prioridad alta si hay productos agotados; media si queda hasta un 20 % de capacidad. Fuera del filtro de fechas."
      />
      <DataTable
        data={data.atencion}
        searchPlaceholder="Buscar máquina con alertas..."
        emptyMessage="Sin alertas de stock en máquinas activas."
        columns={[
          {
            accessorKey: 'nombre',
            header: 'Máquina',
            cell: ({ row }) => (
              <div>
                <Link
                  to={'/admin/inventario?maquina=' + row.original.id_maquina}
                  className="font-medium text-primary hover:underline"
                >
                  {row.original.nombre}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{row.original.ubicacion}</p>
              </div>
            ),
          },
          {
            accessorKey: 'ultima_visita',
            header: 'Última visita',
            cell: ({ row }) =>
              row.original.ultima_visita ? formatDate(row.original.ultima_visita) : 'Sin visitas',
          },
          { accessorKey: 'agotados', header: 'Agotados' },
          { accessorKey: 'bajos', header: 'Stock bajo' },
          {
            id: 'prioridad',
            header: 'Prioridad',
            cell: ({ row }) => (
              <Badge
                variant="outline"
                className={
                  row.original.agotados
                    ? 'border-red-100 bg-red-50 text-red-700'
                    : 'border-amber-100 bg-amber-50 text-amber-700'
                }
              >
                {row.original.agotados ? 'Alta' : 'Media'}
              </Badge>
            ),
          },
        ]}
      />
    </section>
  );
}
export function ProductsPanel({ rows }: { rows: Dashboard['productos'] }) {
  return (
    <section>
      <Heading
        title="Productos más vendidos"
        description="Los cinco productos con más unidades vendidas estimadas durante las visitas del período."
      />
      <DataTable
        data={rows}
        searchPlaceholder="Buscar en los productos más vendidos..."
        emptyMessage="Sin ventas estimadas con detalle en este período."
        columns={[
          { accessorKey: 'nombre', header: 'Producto' },
          { accessorKey: 'unidades_vendidas', header: 'Unidades' },
          {
            accessorKey: 'venta_estimada',
            header: 'Venta estimada',
            cell: ({ row }) => <MoneyText value={row.original.venta_estimada} />,
          },
        ]}
      />
    </section>
  );
}
export function VisitsPanel({ rows }: { rows: Dashboard['ultimas_visitas'] }) {
  return (
    <section>
      <Heading
        title="Últimas visitas"
        description="Las diez visitas más recientes del período. Horario de Santiago."
      />
      <DataTable
        data={rows}
        searchPlaceholder="Buscar en las últimas visitas..."
        emptyMessage="No hay visitas registradas en este período."
        columns={[
          { accessorKey: 'fecha', header: 'Fecha', cell: ({ row }) => formatDate(row.original.fecha) },
          { accessorKey: 'maquina', header: 'Máquina' },
          {
            accessorKey: 'responsable',
            header: 'Responsable',
            cell: ({ row }) => row.original.responsable ?? 'Sin responsable',
          },
          { accessorKey: 'unidades_repuestas', header: 'Repuestas' },
          {
            accessorKey: 'dinero_retirado',
            header: 'Dinero retirado',
            cell: ({ row }) => <MoneyText value={row.original.dinero_retirado} />,
          },
        ]}
      />
    </section>
  );
}
