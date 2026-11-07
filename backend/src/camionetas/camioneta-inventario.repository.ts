import type { PoolClient } from 'pg';
import pool from '../config/db.js';
import { HISTORY_PAGE_SIZE } from '../utils/historyPage.js';
import type { CreateCargaDTO } from './camioneta-inventario.dto.js';

export const findInventory = async (id: number) => {
  const { rows } = await pool.query(
    `SELECT p.id_producto, p.nombre AS producto_nombre, p.estado,
            COALESCE(cp.stock_actual, 0) AS stock_actual
     FROM productos p LEFT JOIN camioneta_productos cp
       ON cp.id_producto = p.id_producto AND cp.id_camioneta = $1
     ORDER BY p.nombre`,
    [id],
  );
  return rows;
};

export const findMovements = async (id: number, maxId: number) => {
  const { rows } = await pool.query(
    `SELECT m.id_movimiento, m.id_camioneta, m.id_producto, m.id_bodeguero, m.id_repartidor,
            m.id_movimiento_bodega, m.cantidad, m.stock_final, m.observacion, m.fecha_creacion,
            m.tipo, m.id_reposicion, m.id_maquina, p.nombre AS producto_nombre,
            concat_ws(' ', b.nombre, b.apellido) AS bodeguero_nombre,
            concat_ws(' ', r.nombre, r.apellido) AS repartidor_nombre
     FROM camioneta_movimientos m
     JOIN productos p ON p.id_producto = m.id_producto
     LEFT JOIN usuarios b ON b.id_usuario = m.id_bodeguero
     JOIN usuarios r ON r.id_usuario = m.id_repartidor
     WHERE m.id_camioneta = $1 AND m.id_movimiento <= $2
     ORDER BY m.id_movimiento DESC LIMIT $3`,
    [id, maxId, HISTORY_PAGE_SIZE + 1],
  );
  return rows;
};

export const lockTruck = async (client: PoolClient, id: number) => {
  const { rows } = await client.query(
    'SELECT nombre, patente, estado, id_repartidor FROM camionetas WHERE id_camioneta = $1 FOR SHARE', [id],
  );
  return rows;
};

export const lockUsers = async (client: PoolClient, ids: number[]) => {
  const { rows } = await client.query(
    `SELECT id_usuario, nombre, apellido, rol, estado FROM usuarios
     WHERE id_usuario = ANY($1::integer[]) ORDER BY id_usuario FOR SHARE`,
    [ids],
  );
  return rows;
};

export const lockProduct = async (client: PoolClient, idProducto: number) => {
  const { rows } = await client.query(
    'SELECT id_producto, estado FROM productos WHERE id_producto = $1 FOR SHARE', [idProducto],
  );
  return rows;
};

export const deductWarehouseStock = async (client: PoolClient, cantidad: number, idProducto: number) => {
  const { rows } = await client.query(
    `UPDATE bodega_productos SET stock_actual = stock_actual - $1
     WHERE id_producto = $2 AND stock_actual >= $1 RETURNING stock_actual`,
    [cantidad, idProducto],
  );
  return rows;
};

export const ensureTruckStock = async (client: PoolClient, id: number, idProducto: number) => {
  await client.query(
    `INSERT INTO camioneta_productos (id_camioneta, id_producto) VALUES ($1, $2)
     ON CONFLICT (id_camioneta, id_producto) DO NOTHING`,
    [id, idProducto],
  );
};

export const addTruckStock = async (client: PoolClient, cantidad: number, id: number, idProducto: number) => {
  const { rows } = await client.query(
    `UPDATE camioneta_productos SET stock_actual = (stock_actual::bigint + $1)::integer
     WHERE id_camioneta = $2 AND id_producto = $3
       AND stock_actual::bigint + $1 <= 2147483647 RETURNING stock_actual`,
    [cantidad, id, idProducto],
  );
  return rows;
};

export const insertWarehouseMovement = async (client: PoolClient, carga: CreateCargaDTO, stockFinal: number, observacion: string) => {
  const { rows } = await client.query(
    `INSERT INTO bodega_movimientos (id_producto, tipo, cantidad, stock_final, observacion)
     VALUES ($1, 'SALIDA', $2, $3, $4) RETURNING id_movimiento`,
    [carga.id_producto, carga.cantidad, stockFinal, observacion],
  );
  return rows;
};

export const insertTruckMovement = async (
  client: PoolClient,
  id: number,
  carga: CreateCargaDTO,
  origen: { idRepartidor: number; idMovimientoBodega: number; stockFinal: number },
) => {
  const { rows } = await client.query(
    `INSERT INTO camioneta_movimientos
     (id_camioneta, id_producto, id_bodeguero, id_repartidor, id_movimiento_bodega, cantidad, stock_final, observacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_movimiento, id_camioneta, id_producto, id_bodeguero, id_repartidor,
               id_movimiento_bodega, cantidad, stock_final, observacion, fecha_creacion,
               tipo, id_reposicion, id_maquina`,
    [id, carga.id_producto, carga.id_bodeguero, origen.idRepartidor,
      origen.idMovimientoBodega, carga.cantidad, origen.stockFinal, carga.observacion ?? null],
  );
  return rows[0];
};
