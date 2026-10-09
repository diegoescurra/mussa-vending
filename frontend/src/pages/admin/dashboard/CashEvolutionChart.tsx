import { useId, useState } from 'react';
import { MoneyText, formatMoney } from '../../../components/ui/MoneyText';
import type { Dashboard } from '../../../services/dashboard.service';
import { axisDates, calendarDay, dailySegments, moneyDomain, scale } from './graphHelpers';
import { cellClass, disclosureClass, formatDate, headingClass, panelClass } from './dashboardPresentation';

export function CashEvolutionChart({ rows }: { rows: Dashboard['evolucion'] }) {
  const id = useId();
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const { days, segments } = dailySegments(rows);
  const active = days.find((day) => day.fecha === activeDate);
  const domain = moneyDomain(days.flatMap((day) => [day.dinero_retirado, day.venta_estimada]));
  const dates: [number, number] = days.length ? [calendarDay(days[0].fecha), calendarDay(days[days.length - 1].fecha)] : [0, 1];
  const x = (date: string) => scale(calendarDay(date), dates, [108, 660]);
  const y = (value: number) => scale(value, domain, [224, 24]);
  const allZero = days.every((day) => day.dinero_retirado === 0 && day.venta_estimada === 0);
  const ticks = allZero ? [0] : Array.from({ length: 5 }, (_, index) => domain[0] + (domain[1] - domain[0]) * index / 4);

  return <section className={panelClass} aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`} className="text-lg font-semibold">Caja retirada y venta estimada</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">Por fecha de visita en Santiago, no por fecha real de venta. Solo se muestran dias con visitas; los dias sin visitas no equivalen a cero y no se unen en el grafico.</p>
    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700" aria-label="Leyenda">
      <li className="flex items-center gap-2"><span className="h-0.5 w-6 bg-blue-600" aria-hidden="true" />Caja retirada</li>
      <li className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-teal-700" aria-hidden="true" />Venta estimada</li>
    </ul>
    {days.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No hay visitas para graficar en este periodo.</p> : <>
      <div role="region" aria-label="Grafico diario, desplazable en pantallas pequenas" tabIndex={0} className="mt-4 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600">
        <svg viewBox="0 0 720 278" className="w-full min-w-[520px]" role="group" aria-labelledby={`${id}-title ${id}-desc`}>
          <title id={`${id}-title`}>Comparacion diaria en pesos chilenos</title>
          <desc id={`${id}-desc`}>Azul continuo: dinero retirado. Verde discontinuo: venta estimada. Cada punto permite consultar ambas cifras con teclado o puntero. La tabla contiene todos los dias con visitas.</desc>
          <text x="8" y="14" fontSize="12" fill="#475569">CLP</text>
          {ticks.map((tick, index) => <g key={index}>
            <line x1="108" x2="660" y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" />
            <text x="98" y={y(tick) + 4} textAnchor="end" fontSize="12" fill="#475569">{formatMoney(tick)}</text>
          </g>)}
          {axisDates(days.map((day) => day.fecha)).map((date) => <text key={date} x={x(date)} y="252" textAnchor="middle" fontSize="12" fill="#475569">{formatDate(date)}</text>)}
          <text x="384" y="274" textAnchor="middle" fontSize="12" fill="#475569">Fecha de visita (Santiago)</text>
          {segments.map((segment) => <g key={segment[0].fecha}>
            <polyline points={segment.map((day) => `${x(day.fecha)},${y(day.dinero_retirado)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" />
            <polyline points={segment.map((day) => `${x(day.fecha)},${y(day.venta_estimada)}`).join(' ')} fill="none" stroke="#0f766e" strokeWidth="2" strokeDasharray="6 4" />
          </g>)}
          {days.map((day) => {
            const label = `${formatDate(day.fecha)}: caja retirada ${formatMoney(day.dinero_retirado)}, venta estimada ${formatMoney(day.venta_estimada)}, ${day.visitas} visitas`;
            return <g key={day.fecha} role="img" aria-label={label} tabIndex={0} className="group outline-none" onFocus={() => setActiveDate(day.fecha)} onBlur={() => setActiveDate(null)} onMouseEnter={() => setActiveDate(day.fecha)} onMouseLeave={() => setActiveDate(null)}>
              <title>{label}</title>
              <rect x={x(day.fecha) - 7} y="20" width="14" height="210" fill="transparent" className="group-focus:stroke-blue-600 group-focus:stroke-2" />
              <circle cx={x(day.fecha)} cy={y(day.venta_estimada)} r={activeDate === day.fecha ? 6 : 4} fill="white" stroke="#0f766e" strokeWidth="2" />
              <circle cx={x(day.fecha)} cy={y(day.dinero_retirado)} r={activeDate === day.fecha ? 3 : 2} fill="#2563eb" />
            </g>;
          })}
        </svg>
      </div>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600" aria-live="polite">
        {active ? <>{formatDate(active.fecha)}: caja <MoneyText value={active.dinero_retirado} />, venta estimada <MoneyText value={active.venta_estimada} />; {active.visitas} visitas.</> : 'Pasa el puntero o enfoca un punto con Tab para consultar sus valores. Tambien puedes abrir la tabla completa.'}
      </p>
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
