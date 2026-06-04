import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import type { CreateProductoDTO, Producto, UpdateProductoDTO } from "./producto.type.js";

export const getAllProductos = async () => {
    const query = 'SELECT * FROM productos';
    const result = await pool.query(query);
    return result.rows;
}

export const getProductoById = async (id: number) => {
    const { rows } = await pool.query('SELECT * FROM productos WHERE id_producto = $1', [id]);
    return rows[0];
}

export const createProducto = async (producto: CreateProductoDTO) => {
    const { nombre, id_proveedor, precio_venta, costo_compra } = producto;
    const { rows } = await pool.query(
        'INSERT INTO productos (nombre, id_proveedor, precio_venta, costo_compra) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, id_proveedor, precio_venta, costo_compra]
    );
    return rows[0];
}

export const updateProducto = async (producto: UpdateProductoDTO, id: number) => {
    const { nombre, id_proveedor, precio_venta, costo_compra } = producto;
    const oldProducto = await getProductoById(id);

    if (!oldProducto) {
        throw new AppError('Producto no encontrado', 404);
    }

    const { rows } = await pool.query(
        'UPDATE productos SET nombre = $1, id_proveedor = $2, precio_venta = $3, costo_compra = $4 WHERE id_producto = $5 RETURNING *',
        [nombre, id_proveedor, precio_venta, costo_compra, id]
    );
    return rows[0];
}

export const deleteProducto = async (id: number) => {
    await pool.query('DELETE FROM productos WHERE id_producto = $1', [id]);
}
