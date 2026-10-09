import { useId } from 'react';
import { MoneyText, formatMoney } from '../../../components/ui/MoneyText';
import type { Dashboard } from '../../../services/dashboard.service';
import { moneyDomain, rankProviders, scale } from './graphHelpers';
import { cellClass, disclosureClass, headingClass } from './dashboardPresentation';

export function ProviderMarginChart({ rows }: { rows: Dashboard['proveedores']['detalle'] }) {
  const id = useId();
  const ranked = rankProviders(rows);
  const shown = ranked.filter((row) => row.unidades_vendidas > 0).slice(0, 8);
  const domain = moneyDomain(shown.map((row) => row.margen_estimado));
  const x = (value: number) => scale(value, domain, [240, 550]);
  const zero = x(0);
  const height = 64 + shown.length * 48;
  const allZero = shown.every((row) => row.margen_estimado === 0);
  const ticks = allZero ? [0] : [...new Set([domain[0], 0, domain[1]])]
    .filter((tick) => tick === 0 || Math.abs(x(tick) - zero) >= 90);

  return <div className="mt-6 border-t border-slate-100 pt-5">
    <h4 id={`${id}-heading`} className="font-semibold text-slate-900">Margen bruto estimado por proveedor</h4>
    <p className="mt-2 text-sm leading-6 text-slate-600">Hasta 8 grupos con mayor magnitud de margen, positivo o negativo. Verde: positivo; rojo: negativo. Importes en CLP; todos los grupos estan en la tabla.</p>
    {shown.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sin datos de productos vendidos estimados para este periodo.</p> : <>
      <div className="mt-4 overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600" role="region" aria-labelledby={`${id}-heading`} tabIndex={0}>
        <svg viewBox={`0 0 720 ${height}`} className="w-full min-w-[520px]" role="group" aria-labelledby={`${id}-title ${id}-desc`}>
          <title id={`${id}-title`}>Margen bruto estimado a costos actuales, pesos chilenos</title>
          <desc id={`${id}-desc`}>Barras a la derecha del cero para margenes positivos y a la izquierda para negativos. No es ganancia neta ni margen historico. Usa Tab para consultar cada grupo.</desc>
          {ticks.map((tick) => <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1="30" y2={height - 10} stroke={tick === 0 ? '#64748b' : '#e2e8f0'} />
            <text x={x(tick)} y="18" textAnchor="middle" fontSize="12" fill="#475569">{formatMoney(tick)}</text>
          </g>)}
          {shown.map((row, index) => {
            const y = 52 + index * 48;
            const label = `${row.nombre}: margen bruto estimado ${formatMoney(row.margen_estimado)}, venta estimada ${formatMoney(row.venta_estimada)}, costo estimado a costos actuales ${formatMoney(row.costo_estimado)}`;
            return <g key={row.id_proveedor ?? 'sin-proveedor'} role="img" aria-label={label} tabIndex={0} className="group outline-none">
              <title>{label}</title>
              <rect x="2" y={y - 20} width="716" height="42" rx="6" fill="transparent" className="group-focus:stroke-blue-600 group-focus:stroke-2" />
              <text x="8" y={y + 4} fontSize="13" fill="#334155">{row.nombre.length > 28 ? `${row.nombre.slice(0, 27)}...` : row.nombre}</text>
              <rect x={Math.min(zero, x(row.margen_estimado))} y={y - 10} width={Math.abs(x(row.margen_estimado) - zero)} height="20" rx="3" fill={row.margen_estimado < 0 ? '#be123c' : '#0f766e'} />
              {row.margen_estimado === 0 ? <circle cx={zero} cy={y} r="3" fill="#64748b" /> : null}
              <text x="710" y={y + 4} textAnchor="end" fontSize="13" fill={row.margen_estimado < 0 ? '#be123c' : '#334155'}>{formatMoney(row.margen_estimado)}</text>
            </g>;
          })}
        </svg>
      </div>
      {allZero ? <p className="mt-2 text-sm text-slate-600">Todos los grupos mostrados tienen margen estimado cero.</p> : null}
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
