import type { PoolClient } from 'pg';
import pool from '../config/db.js';
import { HISTORY_PAGE_SIZE } from '../utils/historyPage.js';
import type { CreateBodegaMovimientoDTO } from './bodega.dto.js';

export const findInventory = async () => {
  const { rows } = await pool.query(
    `SELECT p.id_producto, p.nombre AS producto_nombre, p.estado,
            COALESCE(b.stock_actual, 0) AS stock_actual
     FROM productos p
     LEFT JOIN bodega_productos b ON b.id_producto = p.id_producto
     ORDER BY p.nombre`,
  );
  return rows;
};

export const findMovements = async (maxId: number) => {
  const { rows } = await pool.query(
    `SELECT m.id_movimiento, m.id_producto, m.tipo, m.cantidad, m.stock_final, m.observacion, m.fecha_creacion, p.nombre AS producto_nombre
     FROM bodega_movimientos m
     JOIN productos p ON p.id_producto = m.id_producto
     WHERE m.id_movimiento <= $1
     ORDER BY m.id_movimiento DESC LIMIT $2`,
    [maxId, HISTORY_PAGE_SIZE + 1],
  );
  return rows;
};

export const findProduct = async (client: PoolClient, idProducto: number) => {
  const { rows } = await client.query(
    'SELECT id_producto FROM productos WHERE id_producto = $1',
    [idProducto],
  );
  return rows;
};

export const ensureInventory = async (client: PoolClient, idProducto: number) => {
  await client.query(
    'INSERT INTO bodega_productos (id_producto) VALUES ($1) ON CONFLICT (id_producto) DO NOTHING',
    [idProducto],
  );
};

export const changeStock = async (client: PoolClient, cambio: number, idProducto: number) => {
  const { rows } = await client.query(
    `UPDATE bodega_productos SET stock_actual = stock_actual + $1
     WHERE id_producto = $2 AND stock_actual::bigint + $1 BETWEEN 0 AND 2147483647
     RETURNING stock_actual`,
    [cambio, idProducto],
  );
  return rows;
};

export const insertMovement = async (client: PoolClient, movimiento: CreateBodegaMovimientoDTO, stockFinal: number) => {
  const { rows } = await client.query(
    `INSERT INTO bodega_movimientos (id_producto, tipo, cantidad, stock_final, observacion)
     VALUES ($1, $2, $3, $4, $5) RETURNING id_movimiento, id_producto, tipo, cantidad, stock_final, observacion, fecha_creacion`,
    [movimiento.id_producto, movimiento.tipo, movimiento.cantidad, stockFinal, movimiento.observacion ?? null],
  );
  return rows[0];
};
