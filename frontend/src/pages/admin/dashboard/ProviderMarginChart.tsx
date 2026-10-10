import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MoneyText, formatMoney } from '../../../components/ui/MoneyText';
import type { Dashboard } from '../../../services/dashboard.service';
import { moneyDomain, rankProviders } from './graphHelpers';
import { cellClass, disclosureClass, headingClass } from './dashboardPresentation';

export function ProviderMarginChart({ rows }: { rows: Dashboard['proveedores']['detalle'] }) {
  const id = useId();
  const ranked = rankProviders(rows);
  const shown = ranked.filter((row) => row.unidades_vendidas > 0).slice(0, 8);
  const domain = moneyDomain(shown.map((row) => row.margen_estimado));
  const height = 64 + shown.length * 48;
  const allZero = shown.every((row) => row.margen_estimado === 0);
  const ticks = allZero ? [0] : [...new Set([domain[0], 0, domain[1]])];
  const chartData = shown.map((row) => ({ ...row, group: String(row.id_proveedor ?? 'sin-proveedor') }));

  return <div className="mt-6 border-t border-slate-100 pt-5">
    <h4 id={`${id}-heading`} className="font-semibold text-slate-900">Margen bruto estimado por proveedor</h4>
    <p className="mt-2 text-sm leading-6 text-slate-600">Hasta 8 grupos con mayor magnitud de margen, positivo o negativo. Verde: positivo; rojo: negativo. Importes en CLP; todos los grupos estan en la tabla.</p>
    {shown.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sin datos de productos vendidos estimados para este periodo.</p> : <>
      <div className="mt-4 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600" role="region" aria-labelledby={`${id}-heading`} tabIndex={0}>
        <div className="min-w-[520px]" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" accessibilityLayer margin={{ top: 12, right: 48, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="#e2e8f0" horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" domain={domain} ticks={ticks} tickFormatter={formatMoney} tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="group" width={160} tickFormatter={(value: string) => { const name = chartData.find((row) => row.group === value)?.nombre ?? ''; return name.length > 24 ? `${name.slice(0, 23)}...` : name; }} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
              <ReferenceLine x={0} stroke="#64748b" />
              <Tooltip labelFormatter={(_, payload) => payload[0]?.payload.nombre ?? ''} formatter={(value) => formatMoney(Number(value))} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 13 }} />
              <Bar dataKey="margen_estimado" name="Margen bruto estimado" barSize={20} radius={3} isAnimationActive={false}>
                {chartData.map((row) => <Cell key={row.group} fill={row.margen_estimado < 0 ? '#be123c' : '#0f766e'} />)}
              </Bar>
              {chartData.filter((row) => row.margen_estimado === 0).map((row) => <ReferenceDot key={row.group} x={0} y={row.group} r={3} fill="#64748b" stroke="none" />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {allZero ? <p className="mt-2 text-sm text-slate-600">Todos los grupos mostrados tienen margen estimado cero.</p> : null}
      <p className="mt-2 text-sm leading-6 text-slate-600">Pasa el puntero o enfoca el grafico con Tab y usa las flechas para consultar los margenes. La tabla incluye ventas y costos de cada grupo.</p>
    </>}
    <details className="mt-4 border-t border-slate-100 pt-4">
      <summary className={disclosureClass}>Ver todos los proveedores y sus datos ({rows.length} grupos)</summary>
      <div className="mt-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600" role="region" aria-label="Datos completos por proveedor" tabIndex={0}>
        <table className="w-full min-w-[850px] text-left text-sm">
          <caption className="sr-only">Atribucion al proveedor actual. Venta, costo y margen bruto estimados en CLP, a costos actuales</caption>
          <thead className="bg-slate-50"><tr>{['Proveedor actual', 'Productos', 'Unidades vendidas estimadas', 'Venta estimada', 'Costo estimado actual', 'Margen bruto estimado', 'Productos vendidos con costo 0'].map((label) => <th key={label} scope="col" className={headingClass}>{label}</th>)}</tr></thead>
          <tbody>{ranked.length ? ranked.map((row) => <tr key={row.id_proveedor ?? 'sin-proveedor'}>
            <th scope="row" className={`${cellClass} font-medium`}>{row.nombre}</th>
            <td className={cellClass}>{row.productos}</td><td className={cellClass}>{row.unidades_vendidas}</td>
            <td className={`${cellClass} whitespace-nowrap`}><MoneyText value={row.venta_estimada} /></td>
            <td className={`${cellClass} whitespace-nowrap`}><MoneyText value={row.costo_estimado} /></td>
            <td className={`${cellClass} whitespace-nowrap ${row.margen_estimado < 0 ? 'text-red-700' : ''}`}><MoneyText value={row.margen_estimado} /></td>
            <td className={cellClass}>{row.productos_costo_cero}</td>
          </tr>) : <tr><td colSpan={7} className={cellClass}>Sin datos por proveedor en el periodo.</td></tr>}</tbody>
        </table>
      </div>
    </details>
  </div>;
}
