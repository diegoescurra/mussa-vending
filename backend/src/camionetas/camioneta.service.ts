import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { SaveCamionetaDTO } from './camioneta.type.js';

const camionetaSelect = `SELECT c.*, u.nombre AS repartidor_nombre, u.apellido AS repartidor_apellido
  FROM camionetas c JOIN usuarios u ON u.id_usuario = c.id_repartidor`;

export const getAllCamionetas = async () => {
  const { rows } = await pool.query(`${camionetaSelect} ORDER BY c.id_camioneta`);
  return rows;
};

export const getCamionetaById = async (id: number) => {
  const { rows } = await pool.query(`${camionetaSelect} WHERE c.id_camioneta = $1`, [id]);
  if (!rows.length) throw new AppError('Camioneta no encontrada', 404);
  return rows[0];
};

export const saveCamioneta = async (camioneta: SaveCamionetaDTO, id?: number) => {
  if (!camioneta || typeof camioneta.patente !== 'string' || !camioneta.patente.trim()
      || typeof camioneta.nombre !== 'string' || !camioneta.nombre.trim()
      || !Number.isInteger(camioneta.id_repartidor) || camioneta.id_repartidor <= 0 || camioneta.id_repartidor > 2147483647
      || typeof camioneta.estado !== 'boolean') {
    throw new AppError('Debe enviar patente, nombre, repartidor y estado validos', 400);
  }
  if (id !== undefined) await getCamionetaById(id);

  const values = [camioneta.patente.trim().toUpperCase(), camioneta.nombre.trim(), camioneta.id_repartidor, camioneta.estado];
  try {
    // La asignacion solo se guarda si el usuario sigue siendo un reponedor activo.
    const { rows } = id === undefined
      ? await pool.query(
        `INSERT INTO camionetas (patente, nombre, id_repartidor, estado)
         SELECT $1, $2, u.id_usuario, $4 FROM usuarios u
         WHERE u.id_usuario = $3 AND u.rol = 'REPONEDOR' AND u.estado = true
         RETURNING *`,
        values,
      )
      : await pool.query(
        `UPDATE camionetas c SET patente = $1, nombre = $2, id_repartidor = u.id_usuario, estado = $4
         FROM usuarios u WHERE c.id_camioneta = $5 AND u.id_usuario = $3
         AND u.rol = 'REPONEDOR' AND u.estado = true RETURNING c.*`,
        [...values, id],
      );
    if (!rows.length) throw new AppError('El repartidor debe ser un usuario activo con rol REPONEDOR', 400);
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
    const result = await pool.query('DELETE FROM camionetas WHERE id_camioneta = $1 RETURNING id_camioneta', [id]);
    if (!result.rows.length) throw new AppError('Camioneta no encontrada', 404);
  } catch (error) {
    if ((error as { code?: string }).code === '23503') {
      throw new AppError('La camioneta tiene inventario o entregas registradas; desactivela en lugar de eliminarla', 409);
    }
    throw error;
  }
};
