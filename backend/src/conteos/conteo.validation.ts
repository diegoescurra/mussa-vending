import { AppError } from '../utils/AppError.js';
import { isNonNegativeInt32, isPositiveInt32 } from '../utils/int32.js';
import type { CreateConteoDTO } from './conteo.dto.js';

export const validateConteoBody = (body: unknown): CreateConteoDTO => {
  const conteo = body as CreateConteoDTO;
  if (!conteo || !isPositiveInt32(conteo.id_responsable) || !isPositiveInt32(conteo.id_producto)
    || (conteo.id_camioneta !== undefined && !isPositiveInt32(conteo.id_camioneta))
    || !isNonNegativeInt32(conteo.stock_fisico)) {
    throw new AppError('Envia responsable y producto validos, y stock fisico entero entre 0 y 2147483647', 400);
  }
  if (conteo.observacion !== undefined && typeof conteo.observacion !== 'string') {
    throw new AppError('La observacion debe ser texto', 400);
  }
  return conteo;
};
