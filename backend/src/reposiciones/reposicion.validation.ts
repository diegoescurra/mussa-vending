import { AppError } from '../utils/AppError.js';
import { isNonNegativeInt32, isPositiveInt32 } from '../utils/int32.js';
import type { CreateReposicionDTO } from './reposicion.dto.js';

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const validateReposicionBody = (body: unknown): CreateReposicionDTO => {
  const reposicion = body as CreateReposicionDTO;
  if (!reposicion || typeof reposicion.id_operacion !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reposicion.id_operacion)) {
    throw new AppError('Debe enviar un identificador unico de operacion UUID', 400);
  }
  if (!isPositiveInt32(reposicion.id_maquina)) {
    throw new AppError('La maquina es obligatoria', 400);
  }
  if (!isPositiveInt32(reposicion.id_repartidor)) {
    throw new AppError('Debe seleccionar un repartidor valido', 400);
  }
  if (reposicion.observacion !== undefined && typeof reposicion.observacion !== 'string') {
    throw new AppError('La observacion debe ser texto', 400);
  }
  if (!isNonNegativeNumber(reposicion.dinero_retirado) || !Array.isArray(reposicion.detalles) || reposicion.detalles.length === 0) {
    throw new AppError('Debe enviar dinero retirado y al menos un detalle', 400);
  }

  for (const detalle of reposicion.detalles) {
    if (!detalle || typeof detalle !== 'object' || !isPositiveInt32(detalle.id_maquina_producto)
      || ![
        detalle.stock_sistema,
        detalle.stock_encontrado,
        detalle.cantidad_vendida,
        detalle.cantidad_repuesta,
        detalle.cantidad_retirada,
        detalle.stock_final,
      ].every(isNonNegativeInt32)
      || !isNonNegativeNumber(detalle.precio_venta_actual)
      || !isNonNegativeNumber(detalle.venta_esperada)) {
      throw new AppError('Los detalles de reposicion contienen valores invalidos', 400);
    }
  }

  // Los reintentos se comparan contra la solicitud original guardada.
  return reposicion;
};
