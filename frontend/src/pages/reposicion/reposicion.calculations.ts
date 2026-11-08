import type { CreateReposicionPayload } from '../../services/reposiciones.service';
import type { MaquinaProductoDetalle } from '../../services/maquina-productos.service';

export type ReposicionStep = 1 | 2 | 3 | 4 | 5 | 6;

export type LineState = {
  stockEncontrado: string;
  cantidadRepuesta: string;
  cantidadRetirada: string;
};

export type ReposicionLine = Pick<MaquinaProductoDetalle,
  'id_maquina_producto' | 'version' | 'id_producto' | 'producto_nombre' |
  'stock_actual' | 'capacidad_maxima' | 'precio_venta_actual'>;

type LineErrors = {
  stockEncontrado?: string;
  cantidadRepuesta?: string;
  cantidadRetirada?: string;
};

export const toNumber = (value: string) => Number(value || 0);

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

export const hasErrors = (errors: LineErrors) => Boolean(errors.stockEncontrado || errors.cantidadRepuesta || errors.cantidadRetirada);

export const calculateLines = (
  machineProducts: ReposicionLine[],
  lineState: Record<number, LineState>,
  truckStock: Map<number, number>,
) => {
  const replenishedByProduct = new Map<number, number>();
  for (const item of machineProducts) {
    const cantidad = toNumber(lineState[item.id_maquina_producto]?.cantidadRepuesta ?? '0');
    replenishedByProduct.set(item.id_producto, (replenishedByProduct.get(item.id_producto) ?? 0) + cantidad);
  }

  return machineProducts.map((item) => {
    const values = lineState[item.id_maquina_producto];
    const errors = getLineErrors(item, values);
    const stockEncontrado = toNumber(values?.stockEncontrado ?? '0');
    const cantidadRetirada = toNumber(values?.cantidadRetirada ?? '0');
    const cantidadRepuesta = toNumber(values?.cantidadRepuesta ?? '0');
    const stockCamioneta = truckStock.get(item.id_producto) ?? 0;
    const totalRepuesto = replenishedByProduct.get(item.id_producto) ?? 0;
    const repuestoOtrosSlots = totalRepuesto - cantidadRepuesta;
    const espacioDisponible = Math.max(item.capacidad_maxima - stockEncontrado + cantidadRetirada, 0);
    const stockDisponible = Math.max(stockCamioneta - repuestoOtrosSlots, 0);

    if (!errors.cantidadRepuesta && totalRepuesto > stockCamioneta) {
      errors.cantidadRepuesta = `Total a reponer de este producto: ${totalRepuesto}. Disponible en camioneta: ${stockCamioneta} (compartido entre todos los slots).`;
    }

    return { item, values, errors, stockEncontrado, stockCamioneta, maximoReponible: Math.min(espacioDisponible, stockDisponible) };
  });
};

export const calculateResumen = (machineProducts: ReposicionLine[], lineState: Record<number, LineState>, dineroRetirado: string) => {
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
};

type ReposicionResumen = ReturnType<typeof calculateResumen>;

export const buildReposicionPayload = (
  idOperacion: string,
  idMaquina: string,
  idRepartidor: string,
  observacion: string,
  resumen: ReposicionResumen,
): CreateReposicionPayload => ({
  id_operacion: idOperacion,
  id_maquina: Number(idMaquina),
  id_repartidor: Number(idRepartidor),
  dinero_retirado: resumen.dineroRetirado,
  observacion: observacion || undefined,
  venta_esperada: resumen.ventaEsperada,
  diferencia_dinero: resumen.diferencia,
  detalles: resumen.detalles.map((detalle) => ({
    id_maquina_producto: detalle.item.id_maquina_producto,
    version: detalle.item.version,
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
