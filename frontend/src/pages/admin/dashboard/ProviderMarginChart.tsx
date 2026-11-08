import { DataTable } from '@/components/table/DataTable';
import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MoneyText } from '../../../components/ui/MoneyText';
import { formatMoney } from '../../../utils/formatMoney';
import type { Dashboard } from '../../../services/dashboard.service';
import { moneyDomain, rankProviders } from './graphHelpers';
import { disclosureClass } from './dashboardPresentation';

export function ProviderMarginChart({ rows }: { rows: Dashboard['proveedores']['detalle'] }) {
  const id = useId();
  const ranked = rankProviders(rows);
  const shown = ranked.filter((row) => row.unidades_vendidas > 0).slice(0, 8);
  const domain = moneyDomain(shown.map((row) => row.margen_estimado));
  const height = 64 + shown.length * 48;
  const allZero = shown.every((row) => row.margen_estimado === 0);
  const ticks = allZero ? [0] : [...new Set([domain[0], 0, domain[1]])];
  const chartData = shown.map((row) => ({ ...row, group: String(row.id_proveedor ?? 'sin-proveedor') }));

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <h4 id={`${id}-heading`} className="font-semibold text-slate-900">
        Margen bruto estimado por proveedor
      </h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Hasta 8 grupos con mayor magnitud de margen, positivo o negativo. Verde: positivo; rojo: negativo.
        Importes en CLP; todos los grupos estan en la tabla.
      </p>
      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Sin datos de productos vendidos estimados para este periodo.
        </p>
      ) : (
        <>
          <div
            className="mt-4 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600"
            role="region"
            aria-labelledby={`${id}-heading`}
            tabIndex={0}
          >
            <div className="min-w-[520px]" style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ top: 12, right: 48, bottom: 8, left: 8 }}
                >
                  <CartesianGrid stroke="#e2e8f0" horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={domain}
                    ticks={ticks}
                    tickFormatter={formatMoney}
                    tick={{ fontSize: 12, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="group"
                    width={160}
                    tickFormatter={(value: string) => {
                      const name = chartData.find((row) => row.group === value)?.nombre ?? '';
                      return name.length > 24 ? `${name.slice(0, 23)}...` : name;
                    }}
                    tick={{ fontSize: 12, fill: '#334155' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReferenceLine x={0} stroke="#64748b" />
                  <Tooltip
                    labelFormatter={(_, payload) => payload[0]?.payload.nombre ?? ''}
                    formatter={(value) => formatMoney(Number(value))}
                    contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 13 }}
                  />
                  <Bar
                    dataKey="margen_estimado"
                    name="Margen bruto estimado"
                    barSize={20}
                    radius={3}
                    isAnimationActive={false}
                  >
                    {chartData.map((row) => (
                      <Cell key={row.group} fill={row.margen_estimado < 0 ? '#be123c' : '#0f766e'} />
                    ))}
                  </Bar>
                  {chartData
                    .filter((row) => row.margen_estimado === 0)
                    .map((row) => (
                      <ReferenceDot key={row.group} x={0} y={row.group} r={3} fill="#64748b" stroke="none" />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {allZero ? (
            <p className="mt-2 text-sm text-slate-600">
              Todos los grupos mostrados tienen margen estimado cero.
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pasa el puntero o enfoca el grafico con Tab y usa las flechas para consultar los margenes. La
            tabla incluye ventas y costos de cada grupo.
          </p>
        </>
      )}
      <details className="mt-4 border-t border-slate-100 pt-4">
        <summary className={disclosureClass}>
          Ver todos los proveedores y sus datos ({rows.length} grupos)
        </summary>
        <div className="mt-4">
          <DataTable
            data={ranked}
            searchPlaceholder="Buscar proveedor en el período..."
            emptyMessage="Sin datos por proveedor en el período."
            columns={[
              { accessorKey: 'nombre', header: 'Proveedor actual' },
              { accessorKey: 'productos', header: 'Productos' },
              { accessorKey: 'unidades_vendidas', header: 'Unidades vendidas' },
              {
                accessorKey: 'venta_estimada',
                header: 'Venta estimada',
                cell: ({ row }) => <MoneyText value={row.original.venta_estimada} />,
              },
              {
                accessorKey: 'costo_estimado',
                header: 'Costo actual',
                cell: ({ row }) => <MoneyText value={row.original.costo_estimado} />,
              },
              {
                accessorKey: 'margen_estimado',
                header: 'Margen bruto',
                cell: ({ row }) => <MoneyText value={row.original.margen_estimado} />,
              },
              { accessorKey: 'productos_costo_cero', header: 'Productos con costo 0' },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
