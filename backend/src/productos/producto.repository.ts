import pool from '../config/db.js';
import type { ProductoWriteDTO } from './producto.dto.js';
import type { Producto } from './producto.type.js';

const productColumns = 'id_producto, nombre, precio_venta, costo_compra, estado, fecha_creacion, id_proveedor';

export const findAll = async () => {
    const { rows } = await pool.query<Producto>(`SELECT ${productColumns} FROM productos`);
    return rows;
};

export const findById = async (id: number): Promise<Producto | undefined> => {
    const { rows } = await pool.query<Producto>(`SELECT ${productColumns} FROM productos WHERE id_producto = $1`, [id]);
    return rows[0];
};

export const insert = async ({ nombre, id_proveedor, precio_venta, costo_compra }: ProductoWriteDTO) => {
    const { rows } = await pool.query<Producto>(
        `INSERT INTO productos (nombre, id_proveedor, precio_venta, costo_compra)
         VALUES ($1, $2, $3, $4)
         RETURNING ${productColumns}`,
        [nombre, id_proveedor, precio_venta, costo_compra]
    );
    return rows[0];
};

export const update = async ({ nombre, id_proveedor, precio_venta, costo_compra }: ProductoWriteDTO, id: number) => {
    const { rows } = await pool.query<Producto>(
        `UPDATE productos
         SET nombre = $1, id_proveedor = $2, precio_venta = $3, costo_compra = $4
         WHERE id_producto = $5
         RETURNING ${productColumns}`,
        [nombre, id_proveedor, precio_venta, costo_compra, id]
    );
    return rows[0];
};

export const remove = async (id: number) => {
    const { rowCount } = await pool.query('DELETE FROM productos WHERE id_producto = $1', [id]);
  return rowCount === 1;
};
