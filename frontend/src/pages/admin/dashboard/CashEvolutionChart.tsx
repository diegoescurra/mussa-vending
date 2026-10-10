import { useId } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MoneyText, formatMoney } from '../../../components/ui/MoneyText';
import type { Dashboard } from '../../../services/dashboard.service';
import { axisDates, calendarDay, dailySegments, moneyDomain } from './graphHelpers';
import { cellClass, disclosureClass, formatDate, headingClass, panelClass } from './dashboardPresentation';

export function CashEvolutionChart({ rows }: { rows: Dashboard['evolucion'] }) {
  const id = useId();
  const { days } = dailySegments(rows);
  const chartData = days.flatMap((day, index) => {
    const point = { ...day, timestamp: calendarDay(day.fecha) };
    const next = days[index + 1];
    // A null observation breaks both lines without treating missing visits as zero.
    return next && calendarDay(next.fecha) - point.timestamp > 1
      ? [point, { fecha: '', timestamp: point.timestamp + 0.5, dinero_retirado: null, venta_estimada: null, visitas: null }]
      : [point];
  });
  const domain = moneyDomain(days.flatMap((day) => [day.dinero_retirado, day.venta_estimada]));
  const allZero = days.every((day) => day.dinero_retirado === 0 && day.venta_estimada === 0);
  const ticks = allZero ? [0] : Array.from({ length: 5 }, (_, index) => domain[0] + (domain[1] - domain[0]) * index / 4);

  return <section className={panelClass} aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`} className="text-lg font-semibold">Caja retirada y venta estimada</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">Por fecha de visita en Santiago, no por fecha real de venta. Los días sin visitas se muestran como intervalos sin datos.</p>
    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700" aria-label="Leyenda">
      <li className="flex items-center gap-2"><span className="h-0.5 w-6 bg-blue-600" aria-hidden="true" />Caja retirada</li>
      <li className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-teal-700" aria-hidden="true" />Venta estimada</li>
    </ul>
    {days.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No hay visitas para graficar en este periodo.</p> : <>
      <div role="region" aria-label="Comparacion diaria en pesos chilenos, desplazable en pantallas pequenas" className="mt-4 overflow-x-auto rounded-lg">
        <div className="h-72 min-w-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} accessibilityLayer margin={{ top: 20, right: 24, bottom: 24, left: 8 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} ticks={axisDates(days.map((day) => day.fecha)).map(calendarDay)} tickFormatter={(value: number) => formatDate(new Date(value * 86_400_000).toISOString().slice(0, 10))} tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} label={{ value: 'Fecha de visita (Santiago)', position: 'bottom', offset: 8 }} />
              <YAxis domain={domain} ticks={ticks} width={80} tickFormatter={formatMoney} tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} />
              <Tooltip filterNull labelFormatter={(_, payload) => payload[0]?.payload.fecha ? `${formatDate(payload[0].payload.fecha)}: ${payload[0].payload.visitas} visitas` : 'Sin visitas'} formatter={(value) => formatMoney(Number(value))} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 13 }} />
              <Line dataKey="dinero_retirado" name="Caja retirada" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
              <Line dataKey="venta_estimada" name="Venta estimada" stroke="#0f766e" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: 'white' }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">Consulta los valores con el puntero o con Tab y las flechas.</p>
    </>}
    <details className="mt-4 border-t border-slate-100 pt-4">
      <summary className={disclosureClass}>Ver datos diarios ({days.length} dias con visitas)</summary>
      <div className="mt-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600" role="region" aria-label="Datos diarios" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Caja y venta estimada por fecha de visita, importes en CLP</caption>
          <thead className="bg-slate-50"><tr>{['Fecha de visita', 'Caja retirada', 'Venta estimada', 'Visitas'].map((label) => <th key={label} scope="col" className={headingClass}>{label}</th>)}</tr></thead>
          <tbody>{days.length ? days.map((day) => <tr key={day.fecha}>
            <th scope="row" className={`${cellClass} whitespace-nowrap font-medium`}><time dateTime={day.fecha}>{formatDate(day.fecha)}</time></th>
            <td className={`${cellClass} whitespace-nowrap`}><MoneyText value={day.dinero_retirado} /></td>
            <td className={`${cellClass} whitespace-nowrap`}><MoneyText value={day.venta_estimada} /></td>
            <td className={cellClass}>{day.visitas}</td>
          </tr>) : <tr><td colSpan={4} className={cellClass}>Sin visitas en el periodo.</td></tr>}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
