import { DataTable } from '@/components/table/DataTable';
import { Link } from 'react-router-dom';
import { MoneyText } from '../../../components/ui/MoneyText';
import type { Dashboard } from '../../../services/dashboard.service';
import { ProviderMarginChart } from './ProviderMarginChart';
import { linkClass, panelClass } from './dashboardPresentation';

export function ProvidersPanel({ providers }: { providers: Dashboard['proveedores'] }) {
  return (
    <section className={panelClass} aria-labelledby="dashboard-proveedores">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="dashboard-proveedores" className="text-lg font-semibold">
          Proveedores y margen estimado
        </h3>
        <Link to="/admin/proveedores" className={`${linkClass} text-sm`}>
          Gestionar proveedores
        </Link>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Venta estimada menos costo estimado de las unidades vendidas, usando costos y proveedor actuales del
        producto. No es margen historico ni ganancia neta: no descuenta gastos operativos. La caja retirada no
        se distribuye por proveedor.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Estos totales usan los detalles de productos de las visitas. Pueden diferir del indicador general de
        venta estimada si hay visitas historicas sin detalle.
      </p>
      <dl className="mt-5 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-slate-600">Venta estimada</dt>
          <dd className="mt-2 break-words text-xl font-semibold tabular-nums">
            <MoneyText value={providers.venta_estimada} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Costo estimado actual</dt>
          <dd className="mt-2 break-words text-xl font-semibold tabular-nums">
            <MoneyText value={providers.costo_estimado} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Margen bruto estimado</dt>
          <dd
            className={`mt-2 break-words text-xl font-semibold tabular-nums ${providers.margen_estimado < 0 ? 'text-red-700' : 'text-teal-800'}`}
          >
            <MoneyText value={providers.margen_estimado} />
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Estado actual: <strong className="text-slate-900">{providers.activos} activos</strong> y{' '}
        <strong className="text-slate-900">{providers.inactivos} inactivos</strong>.{' '}
        <Link to="/admin/productos" className={linkClass}>
          {providers.productos_sin_proveedor} productos sin proveedor
        </Link>
        . Estos conteos no se limitan al periodo.
      </p>
      {providers.productos_costo_cero > 0 ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Hay {providers.productos_costo_cero} productos vendidos estimados con costo actual 0. Ese costo
          puede elevar el margen estimado; no implica que el costo sea desconocido.{' '}
          <Link to="/admin/productos" className={linkClass}>
            Revisar costos de productos
          </Link>
          .
        </p>
      ) : null}
      <ProviderMarginChart rows={providers.detalle} />
    </section>
  );
}

export function CashDifferencesPanel({ rows }: { rows: Dashboard['diferencias_maquinas'] }) {
  const sorted = [...rows].sort((a, b) => Math.abs(b.diferencia_caja) - Math.abs(a.diferencia_caja) || a.nombre.localeCompare(b.nombre, 'es'));
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Diferencias de caja</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordenadas por magnitud. Faltantes y sobrantes requieren revisión.
          </p>
        </div>
        <Link to="/admin/maquinas" className={linkClass}>
          Revisar máquinas
        </Link>
      </div>
      <DataTable
        data={sorted}
        searchPlaceholder="Buscar en diferencias de caja..."
        emptyMessage="No hay visitas por máquina en este período."
        columns={[
          {
            accessorKey: 'nombre',
            header: 'Máquina',
            cell: ({ row }) => (
              <Link
                to={'/admin/inventario?maquina=' + row.original.id_maquina}
                className="text-primary hover:underline"
              >
                {row.original.nombre}
              </Link>
            ),
          },
          {
            accessorKey: 'dinero_retirado',
            header: 'Caja retirada',
            cell: ({ row }) => <MoneyText value={row.original.dinero_retirado} />,
          },
          {
            accessorKey: 'venta_estimada',
            header: 'Venta estimada',
            cell: ({ row }) => <MoneyText value={row.original.venta_estimada} />,
          },
          {
            accessorKey: 'diferencia_caja',
            header: 'Diferencia',
            cell: ({ row }) => (
              <span className={row.original.diferencia_caja < 0 ? 'text-red-600' : row.original.diferencia_caja > 0 ? 'text-amber-700' : ''}>
                <MoneyText value={row.original.diferencia_caja} />
              </span>
            ),
          },
          {
            id: 'porcentaje',
            header: '% diferencia',
            cell: ({ row }) =>
              row.original.venta_estimada === 0
                ? '—'
                : new Intl.NumberFormat('es-CL', {
                    maximumFractionDigits: 1,
                    signDisplay: 'exceptZero',
                  }).format((row.original.diferencia_caja / row.original.venta_estimada) * 100) + ' %',
          },
        ]}
      />
    </section>
  );
}
