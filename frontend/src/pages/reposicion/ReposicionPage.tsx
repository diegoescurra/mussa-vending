import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useInventarioMaquinas } from '../../hooks/useInventarioMaquinas';
import { useMaquinas } from '../../hooks/useMaquinas';
import { reposicionesService, type CreateReposicionPayload } from '../../services/reposiciones.service';
import { MachineCombobox } from '../../components/MachineCombobox';
import { StateMessage } from '../../components/StateMessage';
import { camionetasService } from '../../services/camionetas.service';
import { usuariosService } from '../../services/usuarios.service';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type LineState = {
  stockEncontrado: string;
  cantidadRepuesta: string;
  cantidadRetirada: string;
};

type ReposicionLine = {
  id_maquina_producto: number;
  id_producto: number;
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

  for (const key of ['stockEncontrado', 'cantidadRepuesta', 'cantidadRetirada'] as const) {
    const value = toNumber(values?.[key] ?? '0');
    if (!Number.isInteger(value) || value < 0) {
      errors[key] = 'Ingresa un entero mayor o igual a cero.';
    }
  }

  if (!errors.stockEncontrado && stockEncontrado > item.capacidad_maxima) {
    errors.stockEncontrado = `No puede superar la capacidad maxima (${item.capacidad_maxima}).`;
  }

  if (!errors.cantidadRetirada && cantidadRetirada > stockEncontrado) {
    errors.cantidadRetirada = `No puedes retirar mas de lo encontrado (${stockEncontrado}).`;
  }

  if (!errors.cantidadRepuesta && stockFinal > item.capacidad_maxima) {
    errors.cantidadRepuesta = `Maximo a reponer: ${maximoReponible}. Stock final quedaria en ${stockFinal}.`;
  }

  if (!errors.cantidadRepuesta && stockFinal < 0) {
    errors.cantidadRepuesta = 'El stock final no puede quedar negativo.';
  }

  return errors;
};

const hasErrors = (errors: LineErrors) => Boolean(errors.stockEncontrado || errors.cantidadRepuesta || errors.cantidadRetirada);

export const ReposicionPage = () => {
  const queryClient = useQueryClient();
  const maquinasQuery = useMaquinas();
  const inventarioQuery = useInventarioMaquinas();
  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: usuariosService.getAll });
  const camionetasQuery = useQuery({ queryKey: ['camionetas'], queryFn: camionetasService.getAll });
  const maquinas = (maquinasQuery.data ?? []).filter((machine) => machine.estado === 'ACTIVA');
  const inventario = inventarioQuery.data ?? [];
  const [step, setStep] = useState<Step>(1);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedReponedorId, setSelectedReponedorId] = useState('');
  const [lineState, setLineState] = useState<Record<number, LineState>>({});
  const [dineroRetirado, setDineroRetirado] = useState('');
  const [observacion, setObservacion] = useState('');

  const activeMachineId = selectedMachineId;
  const activeMachine = maquinas.find((machine) => String(machine.id_maquina) === activeMachineId);
  const machineProducts = inventario.filter((item) => String(item.id_maquina) === activeMachineId && item.estado);
  const reponedores = (usuariosQuery.data ?? []).filter((user) => user.estado && user.rol === 'REPONEDOR');
  const activeReponedor = reponedores.find((user) => String(user.id_usuario) === selectedReponedorId);
  const assignedTrucks = (camionetasQuery.data ?? []).filter((truck) => truck.estado && truck.id_repartidor === activeReponedor?.id_usuario);
  const activeTruck = assignedTrucks.length === 1 ? assignedTrucks[0] : undefined;
  const truckInventoryQuery = useQuery({
    queryKey: ['camioneta-inventario', activeTruck?.id_camioneta],
    queryFn: () => camionetasService.getInventario(activeTruck!.id_camioneta),
    enabled: Boolean(activeTruck),
  });
  // Keep zero-stock products: missing or inactive products cannot supply the machine.
  const truckStock = new Map((truckInventoryQuery.data ?? []).map((item) => [item.id_producto, item.estado ? Number(item.stock_actual) : 0]));
  const availableStock = (idProducto: number) => truckStock.get(idProducto) ?? 0;
  const truckStockValid = [...truckStock.values()].every((stock) => Number.isInteger(stock) && stock >= 0);
  const baseQueries = [maquinasQuery, inventarioQuery, usuariosQuery, camionetasQuery];
  const dataReady = baseQueries.every((query) => query.isSuccess) && truckInventoryQuery.isSuccess
    && Boolean(activeMachine && activeReponedor && activeTruck) && machineProducts.length > 0
    && truckStockValid;
  const dataError = baseQueries.find((query) => query.isError)?.error ?? (activeTruck && truckInventoryQuery.isError ? truckInventoryQuery.error : null);
  const dataLoading = baseQueries.some((query) => query.isPending) || Boolean(activeTruck && truckInventoryQuery.isPending);
  const replenishedByProduct = new Map<number, number>();
  for (const item of machineProducts) {
    replenishedByProduct.set(item.id_producto, (replenishedByProduct.get(item.id_producto) ?? 0) + toNumber(lineState[item.id_maquina_producto]?.cantidadRepuesta ?? '0'));
  }
  const lineErrors = (item: ReposicionLine) => {
    const errors = getLineErrors(item, lineState[item.id_maquina_producto]);
    const total = replenishedByProduct.get(item.id_producto) ?? 0;
    if (!errors.cantidadRepuesta && total > availableStock(item.id_producto)) {
      errors.cantidadRepuesta = `Total a reponer de este producto: ${total}. Disponible en camioneta: ${availableStock(item.id_producto)} (compartido entre todos los slots).`;
    }
    return errors;
  };

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

  const liveResumen = (() => {
    const detalles = machineProducts.map((item) => {
      const values = lineState[item.id_maquina_producto];
      const stockEncontrado = toNumber(values?.stockEncontrado ?? '0');
      const cantidadRepuesta = toNumber(values?.cantidadRepuesta ?? '0');
      const cantidadRetirada = toNumber(values?.cantidadRetirada ?? '0');
      const cantidadVendida = Math.max(item.stock_actual - stockEncontrado, 0);
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
  })();
  const [savedResumen, setSavedResumen] = useState<typeof liveResumen | null>(null);
  const resumen = savedResumen ?? liveResumen;
  const saveMutation = useMutation({
    mutationFn: reposicionesService.create,
    onMutate: () => activeTruck?.id_camioneta,
    onError: () => setSavedResumen(null),
    onSuccess: (_data, _variables, truckId) => {
      void queryClient.invalidateQueries({ queryKey: ['inventario-maquinas'] });
      void queryClient.invalidateQueries({ queryKey: ['camioneta-inventario', truckId] });
      void queryClient.invalidateQueries({ queryKey: ['camioneta-movimientos', truckId] });
    },
  });
  const locked = saveMutation.isPending || saveMutation.isSuccess;
  const visibleStep = !dataReady && !locked ? 1 : step;
  const foundValid = machineProducts.every((item) => {
    const values = lineState[item.id_maquina_producto];
    return Boolean(values?.stockEncontrado.trim()) && !lineErrors(item).stockEncontrado;
  });
  const quantitiesValid = foundValid && machineProducts.every((item) => {
    const values = lineState[item.id_maquina_producto];
    return Boolean(values?.cantidadRepuesta.trim()) && !hasErrors(lineErrors(item));
  });
  const moneyValid = dineroRetirado.trim() !== '' && Number.isFinite(toNumber(dineroRetirado)) && toNumber(dineroRetirado) >= 0;
  const canFinish = dataReady && quantitiesValid && moneyValid && !locked;

  const resetForm = () => {
    setStep(1);
    setLineState({});
    setDineroRetirado('');
    setObservacion('');
    setSavedResumen(null);
    saveMutation.reset();
  };
  const selectMachine = (id: string) => {
    if (locked || id === selectedMachineId) return;
    resetForm();
    setSelectedMachineId(id);
  };
  const selectReponedor = (id: string) => {
    if (locked || id === selectedReponedorId) return;
    resetForm();
    setSelectedReponedorId(id);
  };

  const canGoNext = () => {
    if (!dataReady || locked) return false;
    if (visibleStep >= 3 && !foundValid) return false;
    if (visibleStep >= 4 && !quantitiesValid) return false;
    if (visibleStep >= 5 && !moneyValid) return false;
    return true;
  };

  const goNext = () => { if (canGoNext()) setStep(Math.min(visibleStep + 1, 6) as Step); };
  const goBack = () => { if (!locked) setStep(Math.max(visibleStep - 1, 1) as Step); };

  const buildPayload = (): CreateReposicionPayload => ({
    id_maquina: Number(activeMachineId),
    id_repartidor: Number(selectedReponedorId),
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
    if (!canFinish) return;
    setSavedResumen(liveResumen);
    saveMutation.mutate(buildPayload());
  };

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
            <div key={item} className={`h-2 rounded-full ${item <= visibleStep ? 'bg-blue-600' : 'bg-slate-300'}`} />
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <fieldset disabled={locked} className="min-w-0">
          {visibleStep === 1 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 1" description="Selecciona el reponedor y la máquina que vas a reponer." />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Reponedor
                <select value={selectedReponedorId} onChange={(event) => selectReponedor(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <option value="">Selecciona un reponedor</option>
                  {reponedores.map((user) => <option key={user.id_usuario} value={user.id_usuario}>{user.nombre} {user.apellido}</option>)}
                </select>
              </label>
              {usuariosQuery.isSuccess && reponedores.length === 0 ? <StateMessage title="Sin reponedores activos" description="Se necesita un usuario activo con rol REPONEDOR para iniciar una reposición." /> : null}
              {maquinasQuery.isSuccess && maquinas.length === 0 ? <StateMessage title="Sin maquinas activas" description="Activa una maquina antes de iniciar una reposicion." /> : null}
              {activeTruck ? <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-950">Camioneta asignada: {activeTruck.patente} - {activeTruck.nombre}</p> : null}
              {selectedReponedorId && usuariosQuery.isSuccess && !activeReponedor ? <StateMessage title="Reponedor no disponible" description="Selecciona un usuario activo con rol REPONEDOR." /> : null}
              {activeReponedor && camionetasQuery.isSuccess && !activeTruck ? <StateMessage title={assignedTrucks.length > 1 ? 'Asignación de camioneta inválida' : 'Sin camioneta activa'} description="El reponedor debe tener exactamente una camioneta activa asignada para continuar." /> : null}
              <MachineCombobox machines={maquinas} selectedMachineId={activeMachineId} isLoading={maquinasQuery.isPending} onSelect={selectMachine} />
              {activeMachine ? <MachineSummary codigo={activeMachine.codigo} nombre={activeMachine.nombre} ubicacion={activeMachine.ubicacion} /> : null}
              {dataLoading ? <StateMessage title="Cargando datos" description="Esperando máquinas, usuarios, asignaciones e inventarios." /> : null}
              {dataError ? <StateMessage title="No se pudieron cargar los datos" description={dataError.message} /> : null}
              {activeMachine && inventarioQuery.isSuccess && machineProducts.length === 0 ? <StateMessage title="Sin productos" description="Esta máquina no tiene productos activos asignados." /> : null}
              {activeTruck && truckInventoryQuery.isSuccess && !truckStockValid ? <StateMessage title="Stock de camioneta inválido" description="El inventario debe contener cantidades enteras mayores o iguales a cero." /> : null}
              {activeTruck && truckInventoryQuery.isSuccess && truckStockValid ? <p className="text-sm text-slate-600">Inventario de camioneta cargado, incluidos productos con stock cero.</p> : null}
            </div>
          ) : null}

          {visibleStep === 2 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 2" description="Revisa los productos cargados en la máquina." />
              <ProductReviewTable rows={machineProducts} />
            </div>
          ) : null}

          {visibleStep === 3 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 3" description="Registra cuántas unidades encontraste físicamente." />
              {machineProducts.map((item) => {
                const values = lineState[item.id_maquina_producto];
                const errors = lineErrors(item);

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

          {visibleStep === 4 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 4" description="Registra cuánto repusiste y si retiraste unidades." />
              <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Las unidades retiradas se registran, pero no vuelven al stock utilizable de la camioneta ni cuentan como ventas.</p>
              {machineProducts.map((item) => {
                const values = lineState[item.id_maquina_producto];
                const errors = lineErrors(item);
                const stockEncontrado = toNumber(values?.stockEncontrado ?? '0');
                const cantidadRetirada = toNumber(values?.cantidadRetirada ?? '0');
                const stockCamioneta = availableStock(item.id_producto);
                const repuestoOtrosSlots = (replenishedByProduct.get(item.id_producto) ?? 0) - toNumber(values?.cantidadRepuesta ?? '0');
                const maximoReponible = Math.min(Math.max(item.capacidad_maxima - stockEncontrado + cantidadRetirada, 0), Math.max(stockCamioneta - repuestoOtrosSlots, 0));

                return (
                  <LineInputCard key={item.id_maquina_producto} title={item.producto_nombre} subtitle={`Encontrado: ${stockEncontrado} | Capacidad: ${item.capacidad_maxima} | Stock camioneta: ${stockCamioneta}`}>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput
                        label="Repuesto"
                        value={values?.cantidadRepuesta ?? ''}
                        max={maximoReponible}
                        error={errors.cantidadRepuesta}
                        hint={`Máximo: ${maximoReponible}. Stock compartido entre slots del mismo producto.`}
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

          {visibleStep === 5 ? (
            <div className="grid gap-5">
              <StepTitle title="Paso 5" description="Ingresa el dinero retirado y una observación si corresponde." />
              <NumberInput label="Dinero retirado" value={dineroRetirado} step="any" error={dineroRetirado !== '' && !moneyValid ? 'Ingresa un monto finito mayor o igual a cero.' : undefined} onChange={setDineroRetirado} />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Observación
                <textarea value={observacion} onChange={(event) => setObservacion(event.target.value)} rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Opcional" />
              </label>
            </div>
          ) : null}

          {visibleStep === 6 ? (
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
                    <p className="mt-1 text-slate-600">Sistema: {detalle.item.stock_actual} | Encontrado: {detalle.stockEncontrado} | Vendido: {detalle.cantidadVendida} | Repuesto: {detalle.cantidadRepuesta} | Retirado: {detalle.cantidadRetirada} | Final: {detalle.stockFinal}</p>
                    <p className="mt-1 font-semibold text-slate-900">Venta esperada: {currencyFormatter.format(detalle.ventaEsperada)}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600">Vendido = máximo entre stock sistema menos encontrado y cero. Los retiros no son ventas ni retornos al stock de la camioneta.</p>
              {!locked && !canFinish ? <p className="text-sm text-red-700">Revisa las cantidades y el dinero en los pasos anteriores antes de finalizar.</p> : null}
              {saveMutation.isError ? <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">{saveMutation.error.message}</p> : null}
              {saveMutation.isSuccess ? <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">Reposición enviada correctamente.</p> : null}
            </div>
          ) : null}
          </fieldset>

          <div className="mt-6 flex gap-3">
            <button type="button" onClick={goBack} disabled={visibleStep === 1 || locked} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
              Atrás
            </button>
            {visibleStep < 6 ? (
              <button type="button" onClick={goNext} disabled={!canGoNext()} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">
                Continuar
              </button>
            ) : (
              <button type="button" onClick={finishReposicion} disabled={!canFinish} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">
                {saveMutation.isPending ? 'Guardando...' : 'Finalizar reposición'}
              </button>
            )}
          </div>
          {saveMutation.isSuccess ? <button type="button" onClick={() => { resetForm(); setSelectedMachineId(''); setSelectedReponedorId(''); }} className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Nueva reposición</button> : null}
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
  step = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  error?: string;
  hint?: string;
  step?: number | 'any';
}) => (
  <label className="grid gap-2 text-sm font-semibold text-slate-700">
    {label}
    <input
      type="number"
      min="0"
      step={step}
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
