import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useInventarioMaquinas } from '../../hooks/useInventarioMaquinas';
import { useMaquinas } from '../../hooks/useMaquinas';
import { reposicionesService, type CreateReposicionPayload } from '../../services/reposiciones.service';
import { MachineCombobox } from '../../components/MachineCombobox';
import { StateMessage } from '../../components/StateMessage';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type LineState = {
  stockEncontrado: string;
  cantidadRepuesta: string;
  cantidadRetirada: string;
};

type ReposicionLine = {
  id_maquina_producto: number;
  producto_nombre: string;
  stock_actual: number;
  capacidad_maxima: number;
  precio_venta_actual: number;
};

type LineErrors = {
  stockEncontrado?: string;
  cantidadRepuesta?: string;
  cantidadRetirada?: string;
};

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const toNumber = (value: string) => Number(value || 0);

const getLineErrors = (item: ReposicionLine, values?: LineState): LineErrors => {
  const errors: LineErrors = {};
  const stockEncontrado = toNumber(values?.stockEncontrado ?? '0');
  const cantidadRepuesta = toNumber(values?.cantidadRepuesta ?? '0');
  const cantidadRetirada = toNumber(values?.cantidadRetirada ?? '0');
  const stockFinal = stockEncontrado + cantidadRepuesta - cantidadRetirada;
  const maximoReponible = Math.max(item.capacidad_maxima - stockEncontrado + cantidadRetirada, 0);

  if (values?.stockEncontrado !== undefined && stockEncontrado > item.capacidad_maxima) {
    errors.stockEncontrado = `No puede superar la capacidad maxima (${item.capacidad_maxima}).`;
  }

  if (values?.cantidadRetirada !== undefined && cantidadRetirada > stockEncontrado) {
    errors.cantidadRetirada = `No puedes retirar mas de lo encontrado (${stockEncontrado}).`;
  }

  if (values?.cantidadRepuesta !== undefined && stockFinal > item.capacidad_maxima) {
    errors.cantidadRepuesta = `Maximo a reponer: ${maximoReponible}. Stock final quedaria en ${stockFinal}.`;
  }

  if (values?.cantidadRepuesta !== undefined && stockFinal < 0) {
    errors.cantidadRepuesta = 'El stock final no puede quedar negativo.';
  }

  return errors;
};

const hasErrors = (errors: LineErrors) => Boolean(errors.stockEncontrado || errors.cantidadRepuesta || errors.cantidadRetirada);

export const ReposicionPage = () => {
  const { data: maquinas = [], isLoading: isLoadingMaquinas } = useMaquinas();
  const { data: inventario = [], isLoading: isLoadingInventario, isError } = useInventarioMaquinas();
  const [step, setStep] = useState<Step>(1);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [lineState, setLineState] = useState<Record<number, LineState>>({});
  const [dineroRetirado, setDineroRetirado] = useState('');
  const [observacion, setObservacion] = useState('');

  const activeMachineId = selectedMachineId || (maquinas[0]?.id_maquina ? String(maquinas[0].id_maquina) : '');
  const activeMachine = maquinas.find((machine) => String(machine.id_maquina) === activeMachineId);
  const machineProducts = inventario.filter((item) => String(item.id_maquina) === activeMachineId && item.estado);

  const saveMutation = useMutation({
    mutationFn: reposicionesService.create,
  });

  const setLineValue = (idMaquinaProducto: number, key: keyof LineState, value: string) => {
    setLineState((current) => ({
      ...current,
      [idMaquinaProducto]: {
        stockEncontrado: current[idMaquinaProducto]?.stockEncontrado ?? '',
        cantidadRepuesta: current[idMaquinaProducto]?.cantidadRepuesta ?? '',
        cantidadRetirada: current[idMaquinaProducto]?.cantidadRetirada ?? '0',
        [key]: value,
      },
    }));
  };

  const resumen = useMemo(() => {
    const detalles = machineProducts.map((item) => {
      const values = lineState[item.id_maquina_producto];
      const stockEncontrado = toNumber(values?.stockEncontrado ?? '0');
      const cantidadRepuesta = toNumber(values?.cantidadRepuesta ?? '0');
      const cantidadRetirada = toNumber(values?.cantidadRetirada ?? '0');
      const cantidadVendida = Math.max(item.stock_actual - stockEncontrado + cantidadRetirada, 0);
      const stockFinal = Math.max(stockEncontrado + cantidadRepuesta - cantidadRetirada, 0);
      const ventaEsperada = cantidadVendida * Number(item.precio_venta_actual);

      return {
        item,
        stockEncontrado,
        cantidadRepuesta,
        cantidadRetirada,
        cantidadVendida,
        stockFinal,
        ventaEsperada,
      };
    });

    const ventaEsperada = detalles.reduce((total, detalle) => total + detalle.ventaEsperada, 0);
    const dinero = toNumber(dineroRetirado);

    return {
      detalles,
      ventaEsperada,
      dineroRetirado: dinero,
      diferencia: dinero - ventaEsperada,
    };
  }, [dineroRetirado, lineState, machineProducts]);

  const canGoNext = () => {
    if (step === 1) return Boolean(activeMachineId);
    if (step === 2) return machineProducts.length > 0;
    if (step === 3) {
      return machineProducts.every((item) => {
        const values = lineState[item.id_maquina_producto];
        return values?.stockEncontrado !== undefined && values.stockEncontrado !== '' && !getLineErrors(item, values).stockEncontrado;
      });
    }
    if (step === 4) {
      return machineProducts.every((item) => {
        const values = lineState[item.id_maquina_producto];
        return values?.cantidadRepuesta !== undefined && values.cantidadRepuesta !== '' && !hasErrors(getLineErrors(item, values));
      });
    }
    if (step === 5) return dineroRetirado !== '';
    return true;
  };

  const goNext = () => setStep((current) => Math.min(current + 1, 6) as Step);
  const goBack = () => setStep((current) => Math.max(current - 1, 1) as Step);

  const buildPayload = (): CreateReposicionPayload => ({
    id_maquina: Number(activeMachineId),
    dinero_retirado: resumen.dineroRetirado,
    observacion: observacion || undefined,
    venta_esperada: resumen.ventaEsperada,
    diferencia_dinero: resumen.diferencia,
    detalles: resumen.detalles.map((detalle) => ({
      id_maquina_producto: detalle.item.id_maquina_producto,
      stock_sistema: detalle.item.stock_actual,
      stock_encontrado: detalle.stockEncontrado,
      cantidad_vendida: detalle.cantidadVendida,
      cantidad_repuesta: detalle.cantidadRepuesta,
      cantidad_retirada: detalle.cantidadRetirada,
      stock_final: detalle.stockFinal,
      precio_venta_actual: Number(detalle.item.precio_venta_actual),
      venta_esperada: detalle.ventaEsperada,
    })),
  });

  const finishReposicion = () => {
    saveMutation.mutate(buildPayload());
  };

  if (isError) {
    return <StateMessage title="No se pudo cargar el inventario" description="Revisa que el backend esté activo antes de iniciar una reposición." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 rounded-3xl bg-slate-950 p-5 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Reposición</p>
          <h1 className="mt-3 text-2xl font-bold">Formulario de reposición</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Pensado para celular o tablet. Avanza paso a paso y confirma el resumen antes de guardar.</p>
        </header>

        <div className="mb-4 grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className={`h-2 rounded-full ${item <= step ? 'bg-blue-600' : 'bg-slate-300'}`} />
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {step === 1 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 1" description="Selecciona la máquina que vas a reponer." />
              <MachineCombobox machines={maquinas} selectedMachineId={activeMachineId} isLoading={isLoadingMaquinas} onSelect={setSelectedMachineId} />
              {activeMachine ? <MachineSummary codigo={activeMachine.codigo} nombre={activeMachine.nombre} ubicacion={activeMachine.ubicacion} /> : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 2" description="Revisa los productos cargados en la máquina." />
              {isLoadingInventario ? <StateMessage title="Cargando productos" description="Obteniendo inventario de la máquina." /> : <ProductReviewTable rows={machineProducts} />}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 3" description="Registra cuántas unidades encontraste físicamente." />
              {machineProducts.map((item) => {
                const values = lineState[item.id_maquina_producto];
                const errors = getLineErrors(item, values);

                return (
                  <LineInputCard key={item.id_maquina_producto} title={item.producto_nombre} subtitle={`Sistema: ${item.stock_actual} | Capacidad: ${item.capacidad_maxima}`}>
                    <NumberInput
                      label="Encontrado"
                      value={values?.stockEncontrado ?? ''}
                      max={item.capacidad_maxima}
                      error={errors.stockEncontrado}
                      onChange={(value) => setLineValue(item.id_maquina_producto, 'stockEncontrado', value)}
                    />
                  </LineInputCard>
                );
              })}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 4" description="Registra cuánto repusiste y si retiraste unidades." />
              {machineProducts.map((item) => {
                const values = lineState[item.id_maquina_producto];
                const errors = getLineErrors(item, values);
                const stockEncontrado = toNumber(values?.stockEncontrado ?? '0');
                const cantidadRetirada = toNumber(values?.cantidadRetirada ?? '0');
                const maximoReponible = Math.max(item.capacidad_maxima - stockEncontrado + cantidadRetirada, 0);

                return (
                  <LineInputCard key={item.id_maquina_producto} title={item.producto_nombre} subtitle={`Encontrado: ${stockEncontrado} | Capacidad: ${item.capacidad_maxima}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput
                        label="Repuesto"
                        value={values?.cantidadRepuesta ?? ''}
                        max={maximoReponible}
                        error={errors.cantidadRepuesta}
                        hint={`Maximo sugerido: ${maximoReponible}`}
                        onChange={(value) => setLineValue(item.id_maquina_producto, 'cantidadRepuesta', value)}
                      />
                      <NumberInput
                        label="Retirado"
                        value={values?.cantidadRetirada ?? '0'}
                        max={stockEncontrado}
                        error={errors.cantidadRetirada}
                        onChange={(value) => setLineValue(item.id_maquina_producto, 'cantidadRetirada', value)}
                      />
                    </div>
                  </LineInputCard>
                );
              })}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 5" description="Ingresa el dinero retirado y una observación si corresponde." />
              <NumberInput label="Dinero retirado" value={dineroRetirado} onChange={setDineroRetirado} />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Observación
                <textarea value={observacion} onChange={(event) => setObservacion(event.target.value)} rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Opcional" />
              </label>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 6" description="Revisa el resumen antes de finalizar." />
              <div className="grid gap-3 rounded-3xl bg-slate-50 p-4">
                <SummaryRow label="Venta esperada" value={currencyFormatter.format(resumen.ventaEsperada)} />
                <SummaryRow label="Dinero retirado" value={currencyFormatter.format(resumen.dineroRetirado)} />
                <SummaryRow label="Diferencia" value={currencyFormatter.format(resumen.diferencia)} highlight={resumen.diferencia >= 0 ? 'positive' : 'negative'} />
              </div>
              <div className="grid gap-3">
                {resumen.detalles.map((detalle) => (
                  <div key={detalle.item.id_maquina_producto} className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="font-bold text-slate-950">{detalle.item.producto_nombre}</p>
                    <p className="mt-1 text-slate-600">Sistema: {detalle.item.stock_actual} | Encontrado: {detalle.stockEncontrado} | Repuesto: {detalle.cantidadRepuesta} | Final: {detalle.stockFinal}</p>
                    <p className="mt-1 font-semibold text-slate-900">Venta esperada: {currencyFormatter.format(detalle.ventaEsperada)}</p>
                  </div>
                ))}
              </div>
              {saveMutation.isError ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">El backend de reposiciones aún no está disponible o rechazó la solicitud.</p> : null}
              {saveMutation.isSuccess ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">Reposición enviada correctamente.</p> : null}
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button type="button" onClick={goBack} disabled={step === 1} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
              Atrás
            </button>
            {step < 6 ? (
              <button type="button" onClick={goNext} disabled={!canGoNext()} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">
                Continuar
              </button>
            ) : (
              <button type="button" onClick={finishReposicion} disabled={saveMutation.isPending} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">
                Finalizar reposición
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

const StepTitle = ({ title, description }: { title: string; description: string }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">{title}</p>
    <h2 className="mt-2 text-xl font-bold text-slate-950">{description}</h2>
  </div>
);

const MachineSummary = ({ codigo, nombre, ubicacion }: { codigo: string; nombre: string; ubicacion: string }) => (
  <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-950">
    <p className="font-bold">{codigo} - {nombre}</p>
    <p className="mt-1">{ubicacion}</p>
  </div>
);

const ProductReviewTable = ({ rows }: { rows: Array<{ id_maquina_producto: number; producto_nombre: string; stock_actual: number; capacidad_maxima: number; precio_venta_actual: number }> }) => {
  if (rows.length === 0) {
    return <StateMessage title="Sin productos" description="Esta máquina todavía no tiene productos asignados." />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id_maquina_producto} className="rounded-2xl border border-slate-200 p-4 text-sm">
          <p className="font-bold text-slate-950">{row.producto_nombre}</p>
          <p className="mt-1 text-slate-600">Stock sistema: {row.stock_actual}</p>
          <p className="text-slate-600">Capacidad: {row.capacidad_maxima}</p>
          <p className="text-slate-600">Precio actual: {currencyFormatter.format(Number(row.precio_venta_actual))}</p>
        </div>
      ))}
    </div>
  );
};

const LineInputCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 p-4">
    <div className="mb-3">
      <p className="font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
    {children}
  </div>
);

const NumberInput = ({
  label,
  value,
  onChange,
  max,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  error?: string;
  hint?: string;
}) => (
  <label className="grid gap-2 text-sm font-semibold text-slate-700">
    {label}
    <input
      type="number"
      min="0"
      max={max}
      inputMode="numeric"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-2xl border px-4 py-3 text-lg font-semibold outline-none focus:ring-4 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
    />
    {hint && !error ? <span className="text-xs font-medium text-slate-500">{hint}</span> : null}
    {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
  </label>
);

const SummaryRow = ({ label, value, highlight }: { label: string; value: string; highlight?: 'positive' | 'negative' }) => {
  const valueClass = highlight === 'positive' ? 'text-emerald-700' : highlight === 'negative' ? 'text-red-700' : 'text-slate-950';

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-lg font-bold ${valueClass}`}>{value}</span>
    </div>
  );
};
