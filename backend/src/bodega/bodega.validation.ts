import { AppError } from '../utils/AppError.js';
import { isPositiveInt32 } from '../utils/int32.js';
import type { CreateBodegaMovimientoDTO } from './bodega.dto.js';

export const validateMovimientoBody = (body: unknown): CreateBodegaMovimientoDTO => {
  const movimiento = body as CreateBodegaMovimientoDTO;
  if (!movimiento || !isPositiveInt32(movimiento.id_producto)) {
    throw new AppError('Debe enviar un producto valido', 400);
  }
  if (movimiento.tipo !== 'ENTRADA' && movimiento.tipo !== 'SALIDA') {
    throw new AppError('El tipo debe ser ENTRADA o SALIDA', 400);
  }
  if (!isPositiveInt32(movimiento.cantidad)) {
    throw new AppError('La cantidad debe ser un entero positivo valido', 400);
  }
  if (movimiento.observacion !== undefined && typeof movimiento.observacion !== 'string') {
    throw new AppError('La observacion debe ser texto', 400);
  }
  return movimiento;
};
