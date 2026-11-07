import pool from '../config/db.js';
import type { CreateMaquinaProductoDTO, UpdateMaquinaProductoDTO } from './maquina-producto.dto.js';
import type { MaquinaProducto, MaquinaProductoDetalle } from './maquina-producto.type.js';

const columns = 'id_maquina_producto, id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual, estado, version';

const maquinaProductoDetalleQuery = `
    SELECT
        mp.id_maquina_producto, mp.id_maquina, mp.id_producto, mp.capacidad_maxima, mp.stock_actual, mp.precio_venta_actual, mp.estado, mp.version,
        m.codigo AS maquina_codigo,
        m.nombre AS maquina_nombre,
        m.ubicacion AS maquina_ubicacion,
        p.nombre AS producto_nombre,
        pr.nombre AS proveedor_nombre
    FROM maquina_productos mp
    INNER JOIN maquinas m ON m.id_maquina = mp.id_maquina
    INNER JOIN productos p ON p.id_producto = mp.id_producto
    LEFT JOIN proveedores pr ON pr.id_proveedor = p.id_proveedor
`;

export const findAll = async () => {
  const { rows } = await pool.query<MaquinaProductoDetalle>(maquinaProductoDetalleQuery);
  return rows;
};

export const findById = async (id: number): Promise<MaquinaProductoDetalle | undefined> => {
  const { rows } = await pool.query<MaquinaProductoDetalle>(
      `${maquinaProductoDetalleQuery} WHERE mp.id_maquina_producto = $1`,
      [id]
  );
  return rows[0];
};

export const insert = async ({ id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual }: CreateMaquinaProductoDTO) => {
  const { rows } = await pool.query<MaquinaProducto>(
      `INSERT INTO maquina_productos (id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual) VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`,
      [id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual]
  );
  return rows[0];
};

export const update = async ({ capacidad_maxima, stock_actual, precio_venta_actual, estado, version }: UpdateMaquinaProductoDTO, id: number) => {
  const { rows } = await pool.query<MaquinaProducto>(
      `UPDATE maquina_productos
       SET capacidad_maxima = COALESCE($1, capacidad_maxima),
           stock_actual = COALESCE($2, stock_actual),
           precio_venta_actual = COALESCE($3, precio_venta_actual),
           estado = COALESCE($4, estado)
       WHERE id_maquina_producto = $5 AND version = $6
       RETURNING ${columns}`,
      [capacidad_maxima, stock_actual, precio_venta_actual, estado, id, version]
  );
  return rows[0];
};

export const remove = async (id: number) => {
  const { rowCount } = await pool.query('DELETE FROM maquina_productos WHERE id_maquina_producto = $1', [id]);
  return rowCount === 1;
};
