import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { CreateBodegaMovimientoDTO } from './bodega.type.js';

export const getInventarioBodega = async () => {
  const { rows } = await pool.query(
    `SELECT p.id_producto, p.nombre AS producto_nombre, p.estado,
            COALESCE(b.stock_actual, 0) AS stock_actual
     FROM productos p
     LEFT JOIN bodega_productos b ON b.id_producto = p.id_producto
     ORDER BY p.nombre`,
  );
  return rows;
};

export const getMovimientosBodega = async () => {
  const { rows } = await pool.query(
    `SELECT m.*, p.nombre AS producto_nombre
     FROM bodega_movimientos m
     JOIN productos p ON p.id_producto = m.id_producto
     ORDER BY m.id_movimiento DESC`,
  );
  return rows;
};

export const createMovimientoBodega = async (movimiento: CreateBodegaMovimientoDTO) => {
  if (!movimiento || !Number.isSafeInteger(movimiento.id_producto) || movimiento.id_producto <= 0) {
    throw new AppError('Debe enviar un producto valido', 400);
  }
  if (movimiento.tipo !== 'ENTRADA' && movimiento.tipo !== 'SALIDA') {
    throw new AppError('El tipo debe ser ENTRADA o SALIDA', 400);
  }
  if (!Number.isInteger(movimiento.cantidad) || movimiento.cantidad <= 0 || movimiento.cantidad > 2147483647) {
    throw new AppError('La cantidad debe ser un entero positivo valido', 400);
  }
  if (movimiento.observacion !== undefined && typeof movimiento.observacion !== 'string') {
    throw new AppError('La observacion debe ser texto', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: productos } = await client.query(
      'SELECT id_producto FROM productos WHERE id_producto = $1',
      [movimiento.id_producto],
    );
    if (!productos.length) {
      throw new AppError('Producto no encontrado', 404);
    }

    await client.query(
      'INSERT INTO bodega_productos (id_producto) VALUES ($1) ON CONFLICT (id_producto) DO NOTHING',
      [movimiento.id_producto],
    );
    const cambio = movimiento.tipo === 'ENTRADA' ? movimiento.cantidad : -movimiento.cantidad;
    // La actualizacion atomica evita salidas simultaneas que dejen stock negativo.
    const { rows: inventario } = await client.query(
      `UPDATE bodega_productos SET stock_actual = stock_actual + $1
       WHERE id_producto = $2 AND stock_actual::bigint + $1 BETWEEN 0 AND 2147483647
       RETURNING stock_actual`,
      [cambio, movimiento.id_producto],
    );
    if (!inventario.length) {
      throw new AppError('Stock insuficiente o saldo fuera del rango permitido', 409);
    }

    const { rows } = await client.query(
      `INSERT INTO bodega_movimientos (id_producto, tipo, cantidad, stock_final, observacion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [movimiento.id_producto, movimiento.tipo, movimiento.cantidad, inventario[0].stock_actual, movimiento.observacion ?? null],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
