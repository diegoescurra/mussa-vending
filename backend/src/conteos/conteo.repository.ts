import type { PoolClient } from 'pg';
import pool from '../config/db.js';
import { HISTORY_PAGE_SIZE } from '../utils/historyPage.js';
import type { CreateConteoDTO } from './conteo.dto.js';

export const findTruck = async (idCamioneta: number) => {
  const { rows } = await pool.query('SELECT id_camioneta FROM camionetas WHERE id_camioneta = $1', [idCamioneta]);
  return rows;
};

export const findCounts = async (idCamioneta: number | undefined, maxId: number) => {
  const { rows } = await pool.query(
    `SELECT c.id_conteo, c.id_camioneta, c.id_producto, c.id_responsable, c.stock_esperado,
            c.stock_fisico, c.diferencia, c.observacion, c.fecha_creacion, p.nombre AS producto_nombre,
            concat_ws(' ', u.nombre, u.apellido) AS responsable_nombre
     FROM conteos c
     JOIN productos p ON p.id_producto = c.id_producto
     JOIN usuarios u ON u.id_usuario = c.id_responsable
     WHERE ${idCamioneta === undefined ? 'c.id_camioneta IS NULL' : 'c.id_camioneta = $3'}
       AND c.id_conteo <= $1
     ORDER BY c.id_conteo DESC LIMIT $2`,
    idCamioneta === undefined ? [maxId, HISTORY_PAGE_SIZE + 1] : [maxId, HISTORY_PAGE_SIZE + 1, idCamioneta],
  );
  return rows;
};

export const lockTruck = async (client: PoolClient, idCamioneta: number) => {
  const { rows } = await client.query(
    'SELECT id_camioneta, id_repartidor FROM camionetas WHERE id_camioneta = $1 FOR SHARE', [idCamioneta],
  );
  return rows;
};

export const lockUser = async (client: PoolClient, idResponsable: number) => {
  const { rows } = await client.query(
    `SELECT id_usuario, rol, estado FROM usuarios
     WHERE id_usuario = $1 ORDER BY id_usuario FOR SHARE`, [idResponsable],
  );
  return rows;
};

export const lockProduct = async (client: PoolClient, idProducto: number) => {
  const { rows } = await client.query(
    'SELECT id_producto FROM productos WHERE id_producto = $1 FOR SHARE', [idProducto],
  );
  return rows;
};

const ensureInventory = async (client: PoolClient, isCentral: boolean, values: number[]) => {
  await client.query(isCentral
    ? 'INSERT INTO bodega_productos (id_producto) VALUES ($1) ON CONFLICT (id_producto) DO NOTHING'
    : `INSERT INTO camioneta_productos (id_camioneta, id_producto) VALUES ($1, $2)
       ON CONFLICT (id_camioneta, id_producto) DO NOTHING`, values);
};

const lockStock = async (client: PoolClient, isCentral: boolean, values: number[]) => {
  const { rows } = await client.query(isCentral
    ? 'SELECT stock_actual FROM bodega_productos WHERE id_producto = $1 FOR UPDATE'
    : 'SELECT stock_actual FROM camioneta_productos WHERE id_camioneta = $1 AND id_producto = $2 FOR UPDATE', values);
  return rows;
};

export const ensureAndLockStock = async (client: PoolClient, idProducto: number, idCamioneta?: number) => {
  const isCentral = idCamioneta === undefined;
  const values = isCentral ? [idProducto] : [idCamioneta, idProducto];
  await ensureInventory(client, isCentral, values);
  return lockStock(client, isCentral, values);
};

export const insertCount = async (client: PoolClient, conteo: CreateConteoDTO, stockEsperado: number) => {
  const { rows } = await client.query(
    `INSERT INTO conteos (id_camioneta, id_producto, id_responsable, stock_esperado, stock_fisico, observacion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_conteo, id_camioneta, id_producto, id_responsable, stock_esperado,
               stock_fisico, diferencia, observacion, fecha_creacion`,
    [conteo.id_camioneta ?? null, conteo.id_producto, conteo.id_responsable, stockEsperado,
      conteo.stock_fisico, conteo.observacion ?? null],
  );
  return rows[0];
};
