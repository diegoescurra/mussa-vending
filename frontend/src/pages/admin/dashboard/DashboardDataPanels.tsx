import { Link } from 'react-router-dom';
import { MoneyText } from '../../../components/ui/MoneyText';
import type { Dashboard } from '../../../services/dashboard.service';
import { ProviderMarginChart } from './ProviderMarginChart';
import { cellClass, headingClass, linkClass, panelClass } from './dashboardPresentation';

export function ProvidersPanel({ providers }: { providers: Dashboard['proveedores'] }) {
  return <section className={panelClass} aria-labelledby="dashboard-proveedores">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h3 id="dashboard-proveedores" className="text-lg font-semibold">Proveedores y margen estimado</h3>
      <Link to="/admin/proveedores" className={`${linkClass} text-sm`}>Gestionar proveedores</Link>
    </div>
    <p className="mt-2 text-sm leading-6 text-slate-600">Venta estimada menos costo estimado de las unidades vendidas, usando costos y proveedor actuales del producto. No es margen historico ni ganancia neta: no descuenta gastos operativos. La caja retirada no se distribuye por proveedor.</p>
    <p className="mt-2 text-sm leading-6 text-slate-600">Estos totales usan los detalles de productos de las visitas. Pueden diferir del indicador general de venta estimada si hay visitas historicas sin detalle.</p>
    <dl className="mt-5 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-3">
      <div><dt className="text-sm text-slate-600">Venta estimada</dt><dd className="mt-2 break-words text-xl font-semibold tabular-nums"><MoneyText value={providers.venta_estimada} /></dd></div>
      <div><dt className="text-sm text-slate-600">Costo estimado actual</dt><dd className="mt-2 break-words text-xl font-semibold tabular-nums"><MoneyText value={providers.costo_estimado} /></dd></div>
      <div><dt className="text-sm text-slate-600">Margen bruto estimado</dt><dd className={`mt-2 break-words text-xl font-semibold tabular-nums ${providers.margen_estimado < 0 ? 'text-red-700' : 'text-teal-800'}`}><MoneyText value={providers.margen_estimado} /></dd></div>
    </dl>
    <p className="mt-4 text-sm leading-6 text-slate-600">Estado actual: <strong className="text-slate-900">{providers.activos} activos</strong> y <strong className="text-slate-900">{providers.inactivos} inactivos</strong>. <Link to="/admin/productos" className={linkClass}>{providers.productos_sin_proveedor} productos sin proveedor</Link>. Estos conteos no se limitan al periodo.</p>
    {providers.productos_costo_cero > 0 ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Hay {providers.productos_costo_cero} productos vendidos estimados con costo actual 0. Ese costo puede elevar el margen estimado; no implica que el costo sea desconocido. <Link to="/admin/productos" className={linkClass}>Revisar costos de productos</Link>.</p> : null}
    <ProviderMarginChart rows={providers.detalle} />
  </section>;
}

export function CashDifferencesPanel({ rows }: { rows: Dashboard['diferencias_maquinas'] }) {
  const sorted = [...rows].sort((a, b) => Math.abs(b.diferencia_caja) - Math.abs(a.diferencia_caja) || a.nombre.localeCompare(b.nombre, 'es'));
  return <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="dashboard-diferencias">
    <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
      <div><h3 id="dashboard-diferencias" className="text-lg font-semibold">Diferencias de caja por maquina</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Primero las diferencias de mayor magnitud. Caja retirada menos venta estimada; negativo indica menos caja que la estimacion, no una perdida confirmada. Revisa las visitas y el stock de la maquina antes de concluir.</p></div>
      <Link to="/admin/maquinas" className={`${linkClass} text-sm`}>Revisar maquinas</Link>
    </div>
    <div role="region" aria-labelledby="dashboard-diferencias" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600">
      <table className="w-full min-w-[660px] text-left text-sm">
        <caption className="sr-only">Diferencias de caja por maquina durante el periodo, importes en CLP</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Maquina', 'Caja retirada', 'Venta estimada', 'Diferencia de caja', 'Visitas'].map((label) => <th key={label} scope="col" className={headingClass}>{label}</th>)}</tr></thead>
        <tbody>{sorted.length ? sorted.map((row) => <tr key={row.id_maquina} className="hover:bg-blue-50/60">
          <th scope="row" className={`${cellClass} font-medium`}><Link to="/admin/maquinas" className={linkClass} aria-label={`Revisar maquinas: ${row.nombre}`}>{row.nombre}</Link></th>
          <td className={`${cellClass} whitespace-nowrap`}><MoneyText value={row.dinero_retirado} /></td>
          <td className={`${cellClass} whitespace-nowrap`}><MoneyText value={row.venta_estimada} /></td>
          <td className={`${cellClass} whitespace-nowrap ${row.diferencia_caja < 0 ? 'text-red-700' : ''}`}><MoneyText value={row.diferencia_caja} /></td>
          <td className={cellClass}>{row.visitas}</td>
        </tr>) : <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay visitas por maquina en este periodo.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
