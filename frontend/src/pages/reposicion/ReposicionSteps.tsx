import { MachineCombobox } from '../../components/MachineCombobox';
import { StateMessage } from '../../components/StateMessage';
import { MoneyText } from '../../components/ui/MoneyText';
import {
  StepTitle,
  MachineSummary,
  ProductReviewTable,
  LineInputCard,
  NumberInput,
  SummaryRow,
} from './ReposicionFields';
import type { ReposicionFlow } from './useReposicion';

export const ReposicionSteps = ({ flow }: { flow: ReposicionFlow }) => {
  const {
    visibleStep,
    locked,
    canFinish,
    saveMutation,
    maquinas,
    maquinasQuery,
    inventarioQuery,
    camionetasQuery,
    truckInventoryQuery,
    activeReponedor,
    activeTruck,
    assignedTrucks,
    activeMachineId,
    activeMachine,
    selectMachine,
    machineProducts,
    dataLoading,
    dataError,
    truckStockValid,
    lines,
    setLineValue,
    dineroRetirado,
    setDineroRetirado,
    moneyValid,
    observacion,
    setObservacion,
    resumen,
  } = flow;

  return (
    <>
      {visibleStep === 1 ? (
        <div className="grid gap-5">
          <StepTitle title="Paso 1" description="Selecciona la máquina que vas a reponer." />
          <p className="text-sm text-slate-600">
            Reponedor:{' '}
            <strong>
              {activeReponedor?.nombre} {activeReponedor?.apellido}
            </strong>
          </p>
          {maquinasQuery.isSuccess && maquinas.length === 0 ? (
            <StateMessage
              title="Sin maquinas activas"
              description="Activa una maquina antes de iniciar una reposicion."
            />
          ) : null}
          {activeTruck ? (
            <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-950">
              Camioneta asignada: {activeTruck.patente} - {activeTruck.nombre}
            </p>
          ) : null}
          {activeReponedor && camionetasQuery.isSuccess && !activeTruck ? (
            <StateMessage
              title={assignedTrucks.length > 1 ? 'Asignación de camioneta inválida' : 'Sin camioneta activa'}
              description="El reponedor debe tener exactamente una camioneta activa asignada para continuar."
            />
          ) : null}
          <MachineCombobox
            machines={maquinas}
            selectedMachineId={activeMachineId}
            isLoading={maquinasQuery.isPending}
            onSelect={selectMachine}
          />
          {activeMachine ? (
            <MachineSummary
              codigo={activeMachine.codigo}
              nombre={activeMachine.nombre}
              ubicacion={activeMachine.ubicacion}
            />
          ) : null}
          {dataLoading ? (
            <StateMessage
              title="Cargando datos"
              description="Esperando máquinas, asignaciones e inventarios."
            />
          ) : null}
          {dataError ? (
            <StateMessage title="No se pudieron cargar los datos" description={dataError.message} />
          ) : null}
          {activeMachine && inventarioQuery.isSuccess && machineProducts.length === 0 ? (
            <StateMessage
              title="Sin productos"
              description="Esta máquina no tiene productos activos asignados."
            />
          ) : null}
          {activeTruck && truckInventoryQuery.isSuccess && !truckStockValid ? (
            <StateMessage
              title="Stock de camioneta inválido"
              description="El inventario debe contener cantidades enteras mayores o iguales a cero."
            />
          ) : null}
          {activeTruck && truckInventoryQuery.isSuccess && truckStockValid ? (
            <p className="text-sm text-slate-600">
              Inventario de camioneta cargado, incluidos productos con stock cero.
            </p>
          ) : null}
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
          <StepTitle
            title="Paso 3"
            description="Cuenta todas las unidades antes de retirar o reponer, incluidas las vencidas o dañadas."
          />
          <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            Si ya retiraste unidades, súmalas al conteo encontrado. En el paso siguiente registrarás cuánto
            retiraste para no confundirlo con ventas.
          </p>
          {lines.map(({ item, values, errors }) => {
            return (
              <LineInputCard
                key={item.id_maquina_producto}
                title={item.producto_nombre}
                subtitle={`Sistema: ${item.stock_actual} | Capacidad: ${item.capacidad_maxima}`}
              >
                <NumberInput
                  label="Encontrado antes del retiro"
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
          <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
            Registra aquí las unidades vencidas o dañadas incluidas en el conteo anterior. No vuelven al stock
            utilizable de la camioneta ni cuentan como ventas.
          </p>
          {lines.map(({ item, values, errors, stockEncontrado, stockCamioneta, maximoReponible }) => {
            return (
              <LineInputCard
                key={item.id_maquina_producto}
                title={item.producto_nombre}
                subtitle={`Encontrado: ${stockEncontrado} | Capacidad: ${item.capacidad_maxima} | Stock camioneta: ${stockCamioneta}`}
              >
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
          <StepTitle
            title="Paso 5"
            description="Ingresa el dinero retirado y una observación si corresponde."
          />
          <NumberInput
            label="Dinero retirado"
            value={dineroRetirado}
            step="any"
            error={
              dineroRetirado !== '' && !moneyValid
                ? 'Ingresa un monto finito mayor o igual a cero.'
                : undefined
            }
            onChange={setDineroRetirado}
          />
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Observación
            <textarea
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
              rows={4}
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="Opcional"
            />
          </label>
        </div>
      ) : null}

      {visibleStep === 6 ? (
        <div className="grid gap-5">
          <StepTitle title="Paso 6" description="Revisa el resumen antes de finalizar." />
          <div className="grid gap-3 rounded-3xl bg-slate-50 p-4">
            <SummaryRow label="Venta esperada" value={<MoneyText value={resumen.ventaEsperada} />} />
            <SummaryRow label="Dinero retirado" value={<MoneyText value={resumen.dineroRetirado} />} />
            <SummaryRow
              label="Diferencia"
              value={<MoneyText value={resumen.diferencia} />}
              highlight={resumen.diferencia >= 0 ? 'positive' : 'negative'}
            />
          </div>
          <div className="grid gap-3">
            {resumen.detalles.map((detalle) => (
              <div
                key={detalle.item.id_maquina_producto}
                className="rounded-2xl border border-slate-200 p-4 text-sm"
              >
                <p className="font-bold text-slate-950">{detalle.item.producto_nombre}</p>
                <p className="mt-1 text-slate-600">
                  Sistema: {detalle.item.stock_actual} | Encontrado: {detalle.stockEncontrado} | Vendido:{' '}
                  {detalle.cantidadVendida} | Repuesto: {detalle.cantidadRepuesta} | Retirado:{' '}
                  {detalle.cantidadRetirada} | Final: {detalle.stockFinal}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  Venta esperada: <MoneyText value={detalle.ventaEsperada} />
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Venta estimada = máximo entre stock sistema menos encontrado antes del retiro y cero. Stock final
            = encontrado + repuesto - retirado. Los retiros no son ventas ni retornos al stock de la
            camioneta.
          </p>
          {!locked && !canFinish ? (
            <p className="text-sm text-red-700">
              Revisa las cantidades y el dinero en los pasos anteriores antes de finalizar.
            </p>
          ) : null}
          {saveMutation.isError ? (
            <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">{saveMutation.error.message}</p>
          ) : null}
          {saveMutation.isSuccess ? (
            <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Reposición enviada correctamente.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
};
