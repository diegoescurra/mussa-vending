import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { RefreshCw, CalendarDays } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useDashboard } from '../../../hooks/useDashboard';
import { CashEvolutionChart } from './CashEvolutionChart';
import { CashDifferencesPanel, ProvidersPanel } from './DashboardDataPanels';
import { DashboardOverview } from './DashboardOverview';
import { AttentionPanel, ProductsPanel, VisitsPanel } from './OperationalPanels';
import { formatDate, panelClass } from './dashboardPresentation';

const santiagoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
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

type DashboardView = (typeof views)[number]['id'];

export const DashboardPage = () => {
  const [applied, setApplied] = useState(() => recentPeriod(30));
  const [form, setForm] = useState(applied);
  const [formError, setFormError] = useState('');
  const [view, setView] = useState<DashboardView>('resumen');
  const viewNav = useRef<HTMLDivElement>(null);
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
    <section className="min-w-0">
      <PageHeader
        title="Resumen operativo"
        description="La caja, el inventario y las prioridades de tu operación."
        actions={
          <Button variant="outline" disabled={dashboard.isFetching} onClick={() => void dashboard.refetch()}>
            <RefreshCw className={dashboard.isFetching ? 'animate-spin' : ''} />
            {dashboard.isFetching ? 'Actualizando…' : 'Actualizar datos'}
          </Button>
        }
      />
      <Card className="mb-6 gap-0 py-4 shadow-none">
        <CardContent>
          <form onSubmit={submitPeriod}>
            <fieldset
              disabled={dashboard.isFetching}
              className="flex flex-wrap items-end justify-between gap-4"
            >
              <legend className="sr-only">Período de consulta en horario de Santiago</legend>
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-lg bg-blue-50 p-2 text-primary">
                  <CalendarDays className="size-5" />
                </span>
                <div>
                  <p className="font-medium">Período de consulta</p>
                  <p className="text-xs text-muted-foreground">Hasta 30 días · Horario de Santiago</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Desde
                  <Input
                    className="w-36 bg-white"
                    type="date"
                    required
                    value={form.desde}
                    onChange={(event) => setForm({ ...form, desde: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Hasta
                  <Input
                    className="w-36 bg-white"
                    type="date"
                    required
                    value={form.hasta}
                    onChange={(event) => setForm({ ...form, hasta: event.target.value })}
                  />
                </label>
                <Button type="submit">Aplicar</Button>
                {[7, 30].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => choosePeriod(days)}
                  >
                    Últimos {days} días
                  </Button>
                ))}
              </div>
            </fieldset>
            {formError ? (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {formError}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
      <Tabs value={view} onValueChange={(value) => setView(value as DashboardView)} className="gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList
            ref={viewNav}
            aria-label="Vistas del dashboard"
            className="grid w-full grid-cols-2 gap-1 bg-slate-100 p-1 group-data-[orientation=horizontal]/tabs:h-auto sm:w-fit sm:grid-cols-4"
          >
            {views.map((item) => (
              <TabsTrigger key={item.id} value={item.id} className="h-9 px-3 py-2 data-[state=active]:bg-white">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="text-xs text-muted-foreground">
            {formatDate(applied.desde)} – {formatDate(applied.hasta)}
          </p>
        </div>
        <p role="status" className="sr-only">
          {dashboard.isFetching ? 'Cargando datos del período' : ''}
        </p>
        {dashboard.isError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h3 className="font-semibold text-red-800">No se pudo cargar el período</h3>
            <p className="my-3 text-sm">{dashboard.error.message}</p>
            <Button
              variant="outline"
              disabled={dashboard.isFetching}
              onClick={() => void dashboard.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : null}
        {data ? (
          <>
            <TabsContent value="resumen">
              <DashboardOverview data={data} onOpen={openDetail} />
            </TabsContent>
            <TabsContent value="caja" className="space-y-6">
              <CashEvolutionChart rows={data.evolucion} />
              <CashDifferencesPanel rows={data.diferencias_maquinas} />
              <VisitsPanel rows={data.ultimas_visitas} />
            </TabsContent>
            <TabsContent value="stock" className="space-y-6">
              <dl
                aria-label="Estado actual de las máquinas"
                className={panelClass + ' grid gap-4 sm:grid-cols-3'}
              >
                {[
                  ['Máquinas activas', data.maquinas.activas],
                  ['En mantención', data.maquinas.mantencion],
                  ['Máquinas inactivas', data.maquinas.inactivas],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-2 text-3xl font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <AttentionPanel data={data} />
            </TabsContent>
            <TabsContent value="ventas" className="space-y-6">
              <ProductsPanel rows={data.productos} />
              <ProvidersPanel providers={data.proveedores} />
            </TabsContent>
          </>
        ) : dashboard.isPending ? (
          <div className="grid gap-4 sm:grid-cols-3" aria-label="Cargando resumen">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : null}
      </Tabs>
    </section>
  );
};
