import pool from '../config/db.js';
import * as repository from './conteo.repository.js';
import type { CreateConteoDTO } from './conteo.dto.js';
import { AppError } from '../utils/AppError.js';
import { historyPage } from '../utils/historyPage.js';

export const getConteos = async (idCamioneta: number | undefined, maxId: number) => {
  if (idCamioneta !== undefined) {
    const rows = await repository.findTruck(idCamioneta);
    if (!rows.length) throw new AppError('Camioneta no encontrada', 404);
  }
  const rows = await repository.findCounts(idCamioneta, maxId);
  return historyPage(rows, (row) => row.id_conteo);
};

export const createConteo = async (conteo: CreateConteoDTO) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mismo orden de bloqueo que las cargas: camioneta, usuarios, producto, saldo.
    let idRepartidor: number | undefined;
    if (conteo.id_camioneta !== undefined) {
      const rows = await repository.lockTruck(client, conteo.id_camioneta);
      if (!rows.length) throw new AppError('Camioneta no encontrada', 404);
      idRepartidor = rows[0].id_repartidor;
    }
    const usuarios = await repository.lockUser(client, conteo.id_responsable);
    const responsable = usuarios[0];
    if (!responsable?.estado || !(responsable.rol === 'ADMIN'
      || (conteo.id_camioneta !== undefined && responsable.rol === 'REPONEDOR' && responsable.id_usuario === idRepartidor))) {
      throw new AppError('El responsable debe ser un ADMIN activo o el REPONEDOR activo asignado a la camioneta', 400);
    }
    const productos = await repository.lockProduct(client, conteo.id_producto);
    if (!productos.length) throw new AppError('Producto no encontrado', 404);

    const saldos = await repository.ensureAndLockStock(client, conteo.id_producto, conteo.id_camioneta);
    const result = await repository.insertCount(client, conteo, saldos[0].stock_actual);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
