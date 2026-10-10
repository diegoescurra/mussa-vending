import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Dashboard } from '../../../services/dashboard.service';
import { MoneyText } from '../../../components/ui/MoneyText';
import { cellClass, headingClass, formatDate } from './dashboardPresentation';

function Panel({ id, title, description, headings, children }: { id: string; title: string; description: string; headings: string[]; children: ReactNode }) {
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby={id}><div className="p-5"><h2 id={id} className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div><div role="region" aria-labelledby={id} tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{headings.map(heading => <th key={heading} scope="col" className={headingClass}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div></section>;
}
function Empty({ columns, children }: { columns: number; children: ReactNode }) { return <tr><td colSpan={columns} className="px-5 py-10 text-center text-sm text-slate-500">{children}</td></tr>; }
export function AttentionPanel({ data }: { data: Dashboard }) {
  return <Panel id="attention" title="Reposiciones prioritarias" description="Último stock registrado · alta: slots agotados; media: stock entre 1 y 20 % de capacidad. Fuera del filtro de fechas." headings={['Máquina / última visita', 'Agotados', 'Bajos', 'Prioridad']}>
    {data.atencion.length ? data.atencion.map(row => <tr key={row.id_maquina} className="hover:bg-blue-50/50"><th scope="row" className={`${cellClass} min-w-44 font-medium`}><Link className="text-blue-700 hover:underline" to={`/admin/inventario?maquina=${row.id_maquina}`}>{row.nombre} ↗</Link><span className="mt-1 block text-xs font-normal text-slate-500">{row.ubicacion}</span><span className="mt-1 block text-xs font-normal text-slate-500">{row.ultima_visita ? formatDate(row.ultima_visita) : 'Sin visitas'}</span></th><td className={`${cellClass} tabular-nums`}>{row.agotados}</td><td className={`${cellClass} tabular-nums`}>{row.bajos}</td><td className={cellClass}><span className={`rounded-md px-2 py-1 text-xs font-semibold ${row.agotados ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{row.agotados ? 'Alta' : 'Media'}</span></td></tr>) : <Empty columns={4}>Sin alertas de stock en máquinas activas.</Empty>}
  </Panel>;
}
export function ProductsPanel({ rows }: { rows: Dashboard['productos'] }) {
  return <Panel id="top-products" title="Productos más vendidos" description="Top 5 por unidades estimadas en las visitas del periodo. Las visitas sin detalle no aportan a este ranking." headings={['Producto', 'Unidades', 'Venta estimada']}>
    {rows.length ? rows.map((row, index) => <tr key={row.id_producto} className="hover:bg-blue-50/50"><th scope="row" className={`${cellClass} font-medium`}><span className="mr-3 text-xs text-slate-400">{index + 1}</span>{row.nombre}</th><td className={`${cellClass} tabular-nums`}>{row.unidades_vendidas}</td><td className={`${cellClass} whitespace-nowrap tabular-nums`}><MoneyText value={row.venta_estimada} /></td></tr>) : <Empty columns={3}>Sin ventas estimadas con detalle en este periodo.</Empty>}
  </Panel>;
}
export function VisitsPanel({ rows }: { rows: Dashboard['ultimas_visitas'] }) {
  return <Panel id="recent-visits" title="Últimas visitas" description="Las 10 visitas más recientes del periodo, incluidas las visitas sin reposición. Horario de Santiago." headings={['Fecha y hora', 'Máquina', 'Responsable', 'Unidades repuestas', 'Dinero retirado']}>
    {rows.length ? rows.map(row => <tr key={row.id_reposicion} className="hover:bg-blue-50/50"><td className={`${cellClass} whitespace-nowrap`}><time dateTime={row.fecha}>{formatDate(row.fecha)}</time></td><th scope="row" className={`${cellClass} font-medium`}>{row.maquina}</th><td className={cellClass}>{row.responsable ?? 'Sin responsable'}</td><td className={`${cellClass} tabular-nums`}>{row.unidades_repuestas}</td><td className={`${cellClass} whitespace-nowrap tabular-nums`}><MoneyText value={row.dinero_retirado} /></td></tr>) : <Empty columns={5}>No hay visitas registradas en este periodo.</Empty>}
  </Panel>;
}
