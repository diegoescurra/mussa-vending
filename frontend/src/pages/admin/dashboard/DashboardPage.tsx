import { useState, type FormEvent } from 'react';
import { MoneyText } from '../../../components/ui/MoneyText';
import { useDashboard } from '../../../hooks/useDashboard';
import { CashEvolutionChart } from './CashEvolutionChart';
import { CashDifferencesPanel, ProvidersPanel } from './DashboardDataPanels';
import { AttentionPanel, ProductsPanel, VisitsPanel } from './OperationalPanels';
import { formatDate, panelClass } from './dashboardPresentation';

const initialPeriod = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return { desde: `${get('year')}-${get('month')}-01`, hasta: `${get('year')}-${get('month')}-${get('day')}` };
};
const buttonClass = 'rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50';
const percent = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
function comparison(current: number, previous: number, visits: number) {
  if (!visits) return 'Sin visitas en el periodo anterior';
  if (previous === 0) return 'Base anterior $0 · sin variación porcentual';
  return `${percent.format((current - previous) / Math.abs(previous) * 100)} % vs. periodo anterior`;
}

export const DashboardPage = () => {
  const [applied, setApplied] = useState(initialPeriod);
  const [form, setForm] = useState(applied);
  const [formError, setFormError] = useState('');
  const dashboard = useDashboard(applied.desde, applied.hasta);
  const data = dashboard.data;
  const applyPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.desde || !form.hasta || form.desde > form.hasta) {
      setFormError('Completa ambas fechas. Desde debe ser anterior o igual a Hasta.');
      return;
    }
    setFormError('');
    if (form.desde === applied.desde && form.hasta === applied.hasta) void dashboard.refetch();
    else setApplied({ ...form });
  };
  return <section className="mx-auto grid max-w-[1600px] min-w-0 gap-5">
    <header className={`${panelClass} flex flex-wrap items-center justify-between gap-6`}>
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Dashboard</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Inicio</h1><p className="mt-2 text-sm text-slate-500">Ventas, caja y prioridades de tu operación.</p></div>
      <form onSubmit={applyPeriod}>
        <fieldset disabled={dashboard.isFetching} className="flex flex-wrap items-end gap-2">
          <legend className="mb-2 text-xs font-semibold text-slate-600">Periodo · Santiago</legend>
          {(['desde', 'hasta'] as const).map(key => <label key={key} className="grid gap-1 text-xs text-slate-500">{key === 'desde' ? 'Desde' : 'Hasta'}<input type="date" required value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus-visible:outline-blue-600" /></label>)}
          <button className={buttonClass} type="submit">Aplicar</button>
        </fieldset>
        {formError ? <p role="alert" className="mt-2 text-sm text-red-700">{formError}</p> : null}
      </form>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <p>{data ? `${formatDate(data.periodo.desde)} — ${formatDate(data.periodo.hasta)} · ${data.indicadores.visitas} visitas registradas` : 'Resumen del periodo seleccionado'}</p>
      <button type="button" disabled={dashboard.isFetching} onClick={() => void dashboard.refetch()} className="rounded px-2 py-1 font-semibold text-blue-700 focus-visible:outline-2 disabled:opacity-50">Actualizar datos ↻</button>
    </div>
    {dashboard.isFetching ? <p role="status" className="text-sm text-blue-700">{dashboard.isPending ? 'Cargando dashboard…' : 'Actualizando datos…'}</p> : null}
    {dashboard.isError ? <div role="alert" className={`${panelClass} border-red-200 text-red-800`}><h2 className="font-semibold">No se pudo cargar el dashboard</h2><p className="my-3 text-sm">{dashboard.error.message}</p><button className={buttonClass} disabled={dashboard.isFetching} onClick={() => void dashboard.refetch()}>Reintentar</button></div> : data ? <>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={dashboard.isFetching}>
        {[
          { label: 'Venta estimada', value: data.indicadores.venta_estimada, icon: '↗', tone: 'text-teal-700 bg-teal-50', note: comparison(data.indicadores.venta_estimada, data.anterior.venta_estimada, data.anterior.visitas) },
          { label: 'Dinero retirado', value: data.indicadores.dinero_retirado, icon: '$', tone: 'text-blue-700 bg-blue-50', note: comparison(data.indicadores.dinero_retirado, data.anterior.dinero_retirado, data.anterior.visitas) },
          { label: 'Diferencia de caja', value: data.indicadores.diferencia_caja, icon: '≈', tone: data.indicadores.diferencia_caja === 0 ? 'text-slate-600 bg-slate-100' : 'text-amber-800 bg-amber-50', note: data.indicadores.venta_estimada ? `${percent.format(data.indicadores.diferencia_caja / data.indicadores.venta_estimada * 100)} % de la venta estimada · revisar desvíos` : 'Sin base de venta para calcular porcentaje' },
          { label: 'Máquinas con alerta', value: data.atencion.length, icon: '!', tone: data.atencion.length ? 'text-red-700 bg-red-50' : 'text-teal-700 bg-teal-50', note: 'Stock registrado actual · fuera del filtro de fechas', count: true },
        ].map(metric => <div key={metric.label} className={panelClass}><span aria-hidden="true" className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold ${metric.tone}`}>{metric.icon}</span><dt className="text-sm text-slate-500">{metric.label}</dt><dd className={`mt-1 text-2xl font-bold tabular-nums ${metric.label === 'Diferencia de caja' && metric.value !== 0 ? 'text-amber-800' : 'text-slate-950'}`}>{metric.count ? metric.value : <MoneyText value={metric.value} />}</dd><dd className="mt-3 text-xs leading-5 text-slate-500">{metric.note}</dd></div>)}
      </dl>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2"><CashEvolutionChart rows={data.evolucion} /><AttentionPanel data={data} /></div>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[1.35fr_1fr]"><CashDifferencesPanel rows={data.diferencias_maquinas} /><ProductsPanel rows={data.productos} /></div>
      <details className={panelClass}><summary className="cursor-pointer font-semibold text-slate-900">Proveedores y margen estimado <span className="ml-2 text-sm font-normal text-slate-500"><MoneyText value={data.proveedores.margen_estimado} /></span></summary><div className="mt-4"><ProvidersPanel providers={data.proveedores} /></div></details>
      <VisitsPanel rows={data.ultimas_visitas} />
      <details className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600"><summary className="cursor-pointer font-semibold text-blue-900">Cómo interpretar estos datos</summary><div className="mt-3 grid gap-2 leading-6"><p>La venta se estima por diferencia de stock en las visitas; no es telemetría ni una medición diaria de ventas. La diferencia de caja es dinero retirado menos venta estimada: ni un faltante confirma una pérdida ni un sobrante confirma una ganancia.</p><p>Las comparaciones usan el periodo inmediatamente anterior de igual duración, con días completos en Santiago. Sin visitas anteriores o con base cero no se calcula una variación porcentual.</p><p>Estado actual: {data.maquinas.activas} máquinas activas, {data.maquinas.mantencion} en mantención y {data.maquinas.inactivas} inactivas. Alertas: {data.stock.agotados} slots agotados y {data.stock.bajos} bajos. Estos datos no se limitan al periodo.</p></div></details>
    </> : null}
  </section>;
};
