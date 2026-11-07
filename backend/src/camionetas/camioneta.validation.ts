import { AppError } from '../utils/AppError.js';
import { isPositiveInt32 } from '../utils/int32.js';
import type { CreateCargaDTO } from './camioneta-inventario.dto.js';
import type { SaveCamionetaDTO } from './camioneta.dto.js';

export const validateCamionetaBody = (body: unknown): SaveCamionetaDTO => {
  const { patente, nombre, id_repartidor, estado } = (body ?? {}) as Partial<SaveCamionetaDTO>;
  const patenteNormalizada = typeof patente === 'string' ? patente.trim().toUpperCase() : '';
  const nombreNormalizado = typeof nombre === 'string' ? nombre.trim() : '';
  if (!patenteNormalizada || !nombreNormalizado || !isPositiveInt32(id_repartidor) || typeof estado !== 'boolean') {
    throw new AppError('Debe enviar patente, nombre, repartidor y estado validos', 400);
  }
  return { patente: patenteNormalizada, nombre: nombreNormalizado, id_repartidor, estado };
};

export const validateCargaBody = (body: unknown): CreateCargaDTO => {
  const carga = body as CreateCargaDTO;
  if (!carga || ![carga.id_bodeguero, carga.id_producto, carga.cantidad].every(isPositiveInt32)) {
    throw new AppError('Debe enviar bodeguero, producto y cantidad entera positiva validos', 400);
  }
  if (carga.observacion !== undefined && typeof carga.observacion !== 'string') {
    throw new AppError('La observacion debe ser texto', 400);
  }
  return carga;
};
