import * as repository from './camioneta.repository.js';
import { AppError } from '../utils/AppError.js';
import type { SaveCamionetaDTO } from './camioneta.dto.js';

export const getAllCamionetas = async () => {
  const rows = await repository.findAll();
  return rows;
};

export const getCamionetaById = async (id: number) => {
  const rows = await repository.findById(id);
  if (!rows.length) throw new AppError('Camioneta no encontrada', 404);
  return rows[0];
};

export const saveCamioneta = async (camioneta: SaveCamionetaDTO, id?: number) => {
  const { patente, nombre, id_repartidor, estado } = camioneta;
  try {
    // La asignacion solo se guarda si el usuario sigue siendo un reponedor activo.
    const rows = id === undefined
      ? await repository.insert(patente, nombre, id_repartidor, estado)
      : await repository.update(id, patente, nombre, id_repartidor, estado);
    if (!rows.length) {
      if (id !== undefined) await getCamionetaById(id);
      throw new AppError('El repartidor debe ser un usuario activo con rol REPONEDOR', 400);
    }
    return rows[0];
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new AppError('La patente o el repartidor ya estan asignados a otra camioneta', 409);
    }
    throw error;
  }
};

export const deleteCamioneta = async (id: number) => {
  try {
    const result = await repository.remove(id);
    if (!result.length) throw new AppError('Camioneta no encontrada', 404);
  } catch (error) {
    if ((error as { code?: string }).code === '23503') {
      throw new AppError('La camioneta tiene inventario o entregas registradas; desactivela en lugar de eliminarla', 409);
    }
    throw error;
  }
};
