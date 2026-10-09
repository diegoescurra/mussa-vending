import { useState, type FormEvent } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { MoneyText } from '../../../components/ui/MoneyText';
import { useDashboard } from '../../../hooks/useDashboard';
import { CashEvolutionChart } from './CashEvolutionChart';
import { CashDifferencesPanel, ProvidersPanel } from './DashboardDataPanels';
import { cellClass, formatDate, headingClass, panelClass } from './dashboardPresentation';

const timeZone = 'America/Santiago';

const initialPeriod = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')!.value;
  const month = parts.find((part) => part.type === 'month')!.value;
  const day = parts.find((part) => part.type === 'day')!.value;
  return { desde: `${year}-${month}-01`, hasta: `${year}-${month}-${day}` };
};

const buttonClass = 'rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60';

export const DashboardPage = () => {
  const [applied, setApplied] = useState(initialPeriod);
  const [form, setForm] = useState(applied);
  const [formError, setFormError] = useState('');
  const dashboard = useDashboard(applied.desde, applied.hasta);
  const data = dashboard.data;

  const applyPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dashboard.isFetching) return;
    if (!form.desde || !form.hasta || form.desde > form.hasta) {
      setFormError('Completa ambas fechas. Desde debe ser anterior o igual a Hasta.');
      return;
    }
    setFormError('');
    if (form.desde === applied.desde && form.hasta === applied.hasta) {
      void dashboard.refetch();
    } else {
      setApplied({ ...form });
    }
  };

  return (
    <section className="min-w-0">
      <PageHeader
        title="Inicio"
        eyebrow="Dashboard"
        description="Caja, estimaciones por proveedor y prioridades operativas."
        actions={<button type="button" className={buttonClass} disabled={dashboard.isFetching} onClick={() => { void dashboard.refetch(); }}>Actualizar</button>}
      />

      <form onSubmit={applyPeriod} className={`${panelClass} mb-6`}>
        <fieldset disabled={dashboard.isFetching} className="flex flex-wrap items-end gap-4">
          <legend className="mb-3 text-sm font-semibold text-slate-900">Periodo inclusivo (Santiago)</legend>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Desde
            <input type="date" required value={form.desde} onChange={(event) => setForm({ ...form, desde: event.target.value })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Hasta
            <input type="date" required value={form.hasta} onChange={(event) => setForm({ ...form, hasta: event.target.value })} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100" />
          </label>
          <button type="submit" className={buttonClass}>Aplicar periodo</button>
        </fieldset>
        {formError ? <p role="alert" className="mt-3 text-sm text-red-700">{formError}</p> : null}
      </form>

      {dashboard.isFetching ? <p role="status" className="mb-4 text-sm text-slate-600">{dashboard.isPending ? 'Cargando dashboard...' : 'Actualizando dashboard...'}</p> : null}
      {dashboard.isError ? (
        <div role="alert" className={`${panelClass} border-red-200`}>
          <h3 className="font-semibold text-red-800">No se pudo cargar el dashboard</h3>
          <p className="my-3 text-sm text-red-700">{dashboard.error.message}</p>
          <button type="button" className={buttonClass} disabled={dashboard.isFetching} onClick={() => { void dashboard.refetch(); }}>Reintentar</button>
        </div>
      ) : data ? (
        <div className="grid gap-6" aria-busy={dashboard.isFetching}>
          <p className="text-sm text-slate-600">
            Periodo: <time dateTime={data.periodo.desde}>{formatDate(data.periodo.desde)}</time> al <time dateTime={data.periodo.hasta}>{formatDate(data.periodo.hasta)}</time>, ambos inclusive. Fechas y horas en Santiago.
            {dashboard.isFetching ? ' Los valores visibles estan pendientes de actualizar.' : ''}
          </p>
          <dl className="grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Dinero retirado', value: data.indicadores.dinero_retirado, money: true },
              { label: 'Venta estimada', value: data.indicadores.venta_estimada, money: true },
              { label: 'Diferencia de caja', value: data.indicadores.diferencia_caja, money: true },
              { label: 'Visitas', value: data.indicadores.visitas, money: false },
            ].map((metric) => (
              <div key={metric.label} className="min-w-0 bg-white p-5 sm:p-6">
                <dt className="text-sm text-slate-600">{metric.label}</dt>
                <dd className={`mt-3 break-words text-2xl font-bold tabular-nums ${metric.label === 'Diferencia de caja' && metric.value < 0 ? 'text-red-700' : 'text-slate-950'}`}>{metric.money ? <MoneyText value={metric.value} /> : metric.value}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            La venta estimada se calcula por diferencia de stock en las visitas del periodo; no es una medicion de ventas en tiempo real.
            {' '}Diferencia de caja = dinero retirado menos venta estimada. Un valor negativo indica que se registro menos dinero del esperado,
            no unidades retiradas ni una perdida confirmada. Las visitas sin unidades repuestas tambien se cuentan.
          </p>

          <CashEvolutionChart rows={data.evolucion} />
          <ProvidersPanel providers={data.proveedores} />
          <CashDifferencesPanel rows={data.diferencias_maquinas} />

          <div className="grid gap-6 xl:grid-cols-2">
            <section className={panelClass} aria-labelledby="dashboard-maquinas">
              <h3 id="dashboard-maquinas" className="text-lg font-semibold">Estado actual de maquinas</h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[['Activas', data.maquinas.activas], ['Inactivas', data.maquinas.inactivas], ['En mantencion', data.maquinas.mantencion]].map(([label, value]) => (
                  <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{value}</dd></div>
                ))}
              </dl>
            </section>
            <section className={panelClass} aria-labelledby="dashboard-stock">
              <h3 id="dashboard-stock" className="text-lg font-semibold">Stock de maquinas</h3>
              <p className="mt-2 text-sm text-slate-600">Slots de maquinas y productos activos segun el ultimo stock registrado, no telemetria en tiempo real. Agotado: 0 unidades. Bajo: mas de 0 y hasta el 20 % de capacidad. No se limita al periodo seleccionado.</p>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div><dt className="text-sm text-slate-600">Slots agotados</dt><dd className="mt-2 text-2xl font-bold tabular-nums text-red-700">{data.stock.agotados}</dd></div>
                <div><dt className="text-sm text-slate-600">Slots bajos</dt><dd className="mt-2 text-2xl font-bold tabular-nums text-amber-700">{data.stock.bajos}</dd></div>
              </dl>
            </section>
          </div>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="dashboard-atencion">
            <div className="p-5 sm:p-6">
              <h3 id="dashboard-atencion" className="text-lg font-semibold">Maquinas que requieren atencion</h3>
              <p className="mt-2 text-sm text-slate-600">Solo maquinas activas, primero las que tienen mas slots agotados y luego mas slots bajos. La ultima visita corresponde a todo el historial.</p>
            </div>
            <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600" role="region" aria-labelledby="dashboard-atencion" tabIndex={0}>
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Alertas de stock en maquinas activas, ordenadas por prioridad</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                  {['Maquina', 'Ubicacion', 'Slots agotados', 'Slots bajos', 'Ultima visita'].map((label) => <th key={label} scope="col" className={headingClass}>{label}</th>)}
                </tr></thead>
                <tbody>
                  {data.atencion.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay alertas de stock en maquinas activas.</td></tr> : data.atencion.map((machine) => (
                    <tr key={machine.id_maquina} className="hover:bg-blue-50/60">
                      <th scope="row" className={`${cellClass} max-w-64 break-words font-medium`}>{machine.nombre}</th>
                      <td className={`${cellClass} max-w-64 break-words`}>{machine.ubicacion}</td>
                      <td className={`${cellClass} tabular-nums`}>{machine.agotados}</td>
                      <td className={`${cellClass} tabular-nums`}>{machine.bajos}</td>
                      <td className={cellClass}>{machine.ultima_visita ? <time dateTime={machine.ultima_visita}>{formatDate(machine.ultima_visita)}</time> : 'Sin visitas registradas'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="dashboard-visitas">
            <div className="p-5 sm:p-6">
              <h3 id="dashboard-visitas" className="text-lg font-semibold">Ultimas 10 visitas del periodo</h3>
              <p className="mt-2 text-sm text-slate-600">Incluye visitas sin reposicion: 0 unidades repuestas.</p>
            </div>
            <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-blue-600" role="region" aria-labelledby="dashboard-visitas" tabIndex={0}>
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Ultimas diez visitas del periodo seleccionado</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                  {['Fecha (Santiago)', 'Maquina', 'Responsable', 'Unidades repuestas', 'Dinero retirado'].map((label) => <th key={label} scope="col" className={headingClass}>{label}</th>)}
                </tr></thead>
                <tbody>
                  {data.ultimas_visitas.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No hay visitas registradas en este periodo.</td></tr> : data.ultimas_visitas.slice(0, 10).map((visit) => (
                    <tr key={visit.id_reposicion} className="hover:bg-blue-50/60">
                      <td className={cellClass}><time dateTime={visit.fecha}>{formatDate(visit.fecha)}</time></td>
                      <td className={`${cellClass} max-w-64 break-words`}>{visit.maquina}</td>
                      <td className={`${cellClass} max-w-64 break-words`}>{visit.responsable ?? 'Sin responsable registrado'}</td>
                      <td className={`${cellClass} tabular-nums`}>{visit.unidades_repuestas === 0 ? '0 (sin reposicion)' : visit.unidades_repuestas}</td>
                      <td className={`${cellClass} whitespace-nowrap tabular-nums`}><MoneyText value={visit.dinero_retirado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
};
