import pool from '../config/db.js';
import * as repository from './bodega.repository.js';
import { AppError } from '../utils/AppError.js';
import { historyPage } from '../utils/historyPage.js';
import type { CreateBodegaMovimientoDTO } from './bodega.dto.js';

export const getInventarioBodega = repository.findInventory;
export const getMovimientosBodega = async (maxId: number) => {
  const rows = await repository.findMovements(maxId);
  return historyPage(rows, (row) => row.id_movimiento);
};

export const createMovimientoBodega = async (movimiento: CreateBodegaMovimientoDTO) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productos = await repository.findProduct(client, movimiento.id_producto);
    if (!productos.length) {
      throw new AppError('Producto no encontrado', 404);
    }

    await repository.ensureInventory(client, movimiento.id_producto);
    const cambio = movimiento.tipo === 'ENTRADA' ? movimiento.cantidad : -movimiento.cantidad;
    // La actualizacion atomica evita salidas simultaneas que dejen stock negativo.
    const inventario = await repository.changeStock(client, cambio, movimiento.id_producto);
    if (!inventario.length) {
      throw new AppError('Stock insuficiente o saldo fuera del rango permitido', 409);
    }

    const result = await repository.insertMovement(client, movimiento, inventario[0].stock_actual);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
