import { useRef, useState, type FormEvent } from 'react';
import { useDashboard } from '../../../hooks/useDashboard';
import { CashEvolutionChart } from './CashEvolutionChart';
import { CashDifferencesPanel, ProvidersPanel } from './DashboardDataPanels';
import { DashboardOverview } from './DashboardOverview';
import { AttentionPanel, ProductsPanel, VisitsPanel } from './OperationalPanels';
import { formatDate, panelClass } from './dashboardPresentation';

const santiagoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
});

function recentPeriod(days: number) {
  const parts = santiagoDate.formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const hasta = `${part('year')}-${part('month')}-${part('day')}`;
  const start = new Date(`${hasta}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { desde: start.toISOString().slice(0, 10), hasta };
}

const views = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'caja', label: 'Caja y visitas' },
  { id: 'stock', label: 'Stock' },
  { id: 'ventas', label: 'Ventas y margen' },
] as const;

type DashboardView = typeof views[number]['id'];

const buttonClass = 'rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50';
const dateClass = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600';

export const DashboardPage = () => {
  const [applied, setApplied] = useState(() => recentPeriod(30));
  const [form, setForm] = useState(applied);
  const [formError, setFormError] = useState('');
  const [view, setView] = useState<DashboardView>('resumen');
  const viewNav = useRef<HTMLElement>(null);
  const dashboard = useDashboard(applied.desde, applied.hasta);
  const data = dashboard.data;

  const applyPeriod = (period: typeof applied) => {
    if (!period.desde || !period.hasta || period.desde > period.hasta) {
      setFormError('Completa ambas fechas y revisa que Desde sea anterior o igual a Hasta.');
      return;
    }
    setFormError('');
    if (period.desde !== applied.desde || period.hasta !== applied.hasta) setApplied(period);
  };

  const submitPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPeriod(form);
  };

  const choosePeriod = (days: number) => {
    const period = recentPeriod(days);
    setForm(period);
    applyPeriod(period);
  };

  const openDetail = (detail: DashboardView) => {
    setView(detail);
    viewNav.current?.focus();
    viewNav.current?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <section className="mx-auto grid max-w-7xl min-w-0 gap-6 pb-4">
      <header className="grid items-end gap-5 xl:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Operación</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Resumen operativo</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Revisa la caja del período y las máquinas que necesitan atención.</p>
        </div>
        <form onSubmit={submitPeriod} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <fieldset disabled={dashboard.isFetching}>
            <legend className="sr-only">Período de consulta en horario de Santiago</legend>
            <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Desde
                <input type="date" required value={form.desde} onChange={(event) => setForm({ ...form, desde: event.target.value })} className={dateClass} />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Hasta
                <input type="date" required value={form.hasta} onChange={(event) => setForm({ ...form, hasta: event.target.value })} className={dateClass} />
              </label>
              <button className={`${buttonClass} col-span-2 sm:col-span-1`} type="submit">Aplicar</button>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-slate-500">Horario de Santiago</span>
              {[7, 30].map((days) => (
                <button key={days} type="button" className="rounded py-1 font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => choosePeriod(days)}>
                  Últimos {days} días
                </button>
              ))}
            </div>
          </fieldset>
          {formError ? <p role="alert" className="mt-2 text-sm text-red-700">{formError}</p> : null}
        </form>
      </header>

      <div>
        <nav ref={viewNav} tabIndex={-1} aria-label="Vistas del dashboard" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 focus-visible:outline-2 focus-visible:outline-blue-600 sm:flex">
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={view === item.id}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 sm:px-4 ${view === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <p><span className="font-semibold text-slate-800">Período</span> · {formatDate(applied.desde)} – {formatDate(applied.hasta)}</p>
          <button type="button" disabled={dashboard.isFetching} onClick={() => void dashboard.refetch()} className="rounded-md px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-2 disabled:opacity-50">
            {dashboard.isFetching ? 'Actualizando…' : 'Actualizar datos'}
          </button>
        </div>
        <p role="status" className="sr-only">{dashboard.isFetching ? 'Cargando datos del período' : ''}</p>
      </div>

      {dashboard.isError ? (
        <div role="alert" className={`${panelClass} border-red-200`}>
          <h3 className="font-semibold text-red-800">No se pudo cargar el período</h3>
          <p className="my-3 text-sm text-slate-600">{dashboard.error.message}</p>
          <button className={buttonClass} disabled={dashboard.isFetching} onClick={() => void dashboard.refetch()}>Reintentar</button>
        </div>
      ) : null}
      {data ? (
        <div className="grid min-w-0 gap-6" aria-busy={dashboard.isFetching}>
          {view === 'resumen' ? <DashboardOverview data={data} onOpen={openDetail} /> : null}
          {view === 'caja' ? (
            <>
              <CashEvolutionChart rows={data.evolucion} />
              <CashDifferencesPanel rows={data.diferencias_maquinas} />
              <VisitsPanel rows={data.ultimas_visitas} />
            </>
          ) : null}
          {view === 'stock' ? (
            <>
              <dl aria-label="Estado actual de las máquinas" className={`${panelClass} grid grid-cols-1 gap-4 sm:grid-cols-3`}>
                <div><dt className="text-sm text-slate-600">Máquinas activas</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{data.maquinas.activas}</dd></div>
                <div><dt className="text-sm text-slate-600">En mantención</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{data.maquinas.mantencion}</dd></div>
                <div><dt className="text-sm text-slate-600">Máquinas inactivas</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{data.maquinas.inactivas}</dd></div>
              </dl>
              <AttentionPanel data={data} />
            </>
          ) : null}
          {view === 'ventas' ? (
            <>
              <ProductsPanel rows={data.productos} />
              <ProvidersPanel providers={data.proveedores} />
            </>
          ) : null}
        </div>
      ) : dashboard.isPending ? (
        <div className={`${panelClass} min-h-32 grid place-items-center text-sm text-slate-600`}>Cargando el período seleccionado…</div>
      ) : null}
    </section>
  );
};
