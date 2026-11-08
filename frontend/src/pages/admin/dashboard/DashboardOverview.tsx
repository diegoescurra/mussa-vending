import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { MoneyText } from '../../../components/ui/MoneyText';
import type { Dashboard } from '../../../services/dashboard.service';
import { linkClass, panelClass } from './dashboardPresentation';

const count = new Intl.NumberFormat('es-CL');
const percent = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });

function cashComparison(data: Dashboard) {
  if (!data.anterior.visitas) return 'Sin visitas en el período anterior';
  if (data.anterior.dinero_retirado === 0) return 'Caja anterior de $0';
  const change =
    ((data.indicadores.dinero_retirado - data.anterior.dinero_retirado) /
      Math.abs(data.anterior.dinero_retirado)) *
    100;
  return `${percent.format(change)} % frente al período anterior`;
}

function machinesLabel(value: number) {
  return `${count.format(value)} ${value === 1 ? 'máquina' : 'máquinas'}`;
}

export function DashboardOverview({
  data,
  onOpen,
}: {
  data: Dashboard;
  onOpen: (detail: 'caja' | 'stock') => void;
}) {
  const differences = data.diferencias_maquinas.filter((row) => row.diferencia_caja !== 0);
  const { dinero_retirado, venta_estimada, diferencia_caja, visitas } = data.indicadores;

  return (
    <div className="space-y-6">
      <dl aria-label="Indicadores del período" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/50 p-5 sm:col-span-2 sm:p-6 xl:col-span-1">
          <dt className="text-sm font-semibold text-blue-700">Caja retirada</dt>
          <dd className="mt-3 wrap-break-word text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
            <MoneyText value={dinero_retirado} />
          </dd>
          <dd className="mt-3 text-sm text-blue-700">{cashComparison(data)}</dd>
        </div>
        <div className={panelClass}>
          <dt className="text-sm font-semibold text-slate-600">Venta estimada</dt>
          <dd className="mt-3 wrap-break-word text-3xl font-bold tracking-tight tabular-nums text-slate-950 sm:text-4xl">
            <MoneyText value={venta_estimada} />
          </dd>
          <dd className="mt-3 text-sm text-slate-600">
            {count.format(visitas)} {visitas === 1 ? 'visita registrada' : 'visitas registradas'}
          </dd>
        </div>
        <div className={panelClass}>
          <dt className="text-sm font-semibold text-slate-600">Diferencia neta de caja</dt>
          <dd
            className={`mt-3 wrap-break-word text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${diferencia_caja < 0 ? 'text-red-700' : diferencia_caja > 0 ? 'text-amber-800' : 'text-slate-950'}`}
          >
            <MoneyText value={diferencia_caja} />
          </dd>
          <dd className="mt-3 text-sm text-slate-600">Caja retirada menos venta estimada</dd>
        </div>
      </dl>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
        <Card className="gap-0 p-5 shadow-none sm:p-6" aria-labelledby="dashboard-stock-overview">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="dashboard-stock-overview" className="text-lg font-bold text-slate-950">
                Máquinas que requieren atención
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Stock actual · {machinesLabel(data.atencion.length)} con alertas
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpen('stock')}>
              Ver stock
            </Button>
          </div>
          {data.atencion.length ? (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {data.atencion.slice(0, 3).map((row) => (
                <li
                  key={row.id_maquina}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      className={`${linkClass} text-sm`}
                      to={`/admin/inventario?maquina=${row.id_maquina}`}
                    >
                      {row.nombre}
                    </Link>
                    <p className="mt-1 break-words text-xs text-slate-600">{row.ubicacion}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs font-semibold tabular-nums">
                    {row.agotados ? (
                      <span className="rounded-md bg-red-50 px-2 py-1 text-red-800">
                        {count.format(row.agotados)} {row.agotados === 1 ? 'agotado' : 'agotados'}
                      </span>
                    ) : null}
                    {row.bajos ? (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-900">
                        {count.format(row.bajos)} con stock bajo
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Sin alertas de stock en las máquinas activas.
            </p>
          )}
        </Card>

        <Card className="gap-0 p-5 shadow-none sm:p-6" aria-labelledby="dashboard-cash-overview">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id="dashboard-cash-overview" className="text-lg font-bold text-slate-950">
                Diferencias de caja por máquina
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Período seleccionado · {machinesLabel(differences.length)} con diferencias
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpen('caja')}>
              Ver caja y visitas
            </Button>
          </div>
          {differences.length ? (
            <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {differences.slice(0, 3).map((row) => (
                <li
                  key={row.id_maquina}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      className={`${linkClass} text-sm`}
                      to={`/admin/inventario?maquina=${row.id_maquina}`}
                    >
                      {row.nombre}
                    </Link>
                    <p className="mt-1 text-xs text-slate-600">
                      {count.format(row.visitas)} {row.visitas === 1 ? 'visita' : 'visitas'}
                    </p>
                  </div>
                  <div
                    className={`text-right text-sm font-bold tabular-nums ${row.diferencia_caja < 0 ? 'text-red-700' : 'text-amber-900'}`}
                  >
                    <MoneyText value={row.diferencia_caja} />
                    <span className="mt-0.5 block text-xs font-medium">
                      {row.diferencia_caja < 0 ? 'Faltante' : 'Sobrante'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {visitas
                ? 'Sin diferencias de caja por máquina en este período.'
                : 'Sin visitas registradas en este período.'}
            </p>
          )}
        </Card>
      </div>

      <p className="text-xs leading-5 text-slate-600">
        Las ventas se estiman con el stock de cada visita. El resumen muestra las primeras tres alertas y las
        tres diferencias de mayor magnitud. El stock se consulta según el último registro disponible.
      </p>
    </div>
  );
}
