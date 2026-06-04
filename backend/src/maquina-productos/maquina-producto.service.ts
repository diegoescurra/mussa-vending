import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import type { CreateMaquinaProductoDTO, UpdateMaquinaProductoDTO } from "./maquina-producto.type.js";

const maquinaProductoDetalleQuery = `
    SELECT
        mp.*,
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

export const getAllMaquinaProductos = async () => {
    const { rows } = await pool.query(maquinaProductoDetalleQuery);
    return rows;
}

export const getMaquinaProductoById = async (id: number) => {
    const { rows } = await pool.query(
        `${maquinaProductoDetalleQuery} WHERE mp.id_maquina_producto = $1`,
        [id]
    );
    return rows[0];
}

export const createMaquinaProducto = async (maquinaProducto: CreateMaquinaProductoDTO) => {
    const { id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual } = maquinaProducto;
    const { rows } = await pool.query(
        'INSERT INTO maquina_productos (id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual]
    );
    return rows[0];
}

export const updateMaquinaProducto = async (maquinaProducto: UpdateMaquinaProductoDTO, id: number) => {
    const { capacidad_maxima, stock_actual, precio_venta_actual, estado } = maquinaProducto;
    const oldMaquinaProducto = await getMaquinaProductoById(id);

    if (!oldMaquinaProducto) {
        throw new AppError('Producto de maquina no encontrado', 404);
    }

    const { rows } = await pool.query(
        `UPDATE maquina_productos
         SET capacidad_maxima = COALESCE($1, capacidad_maxima),
             stock_actual = COALESCE($2, stock_actual),
             precio_venta_actual = COALESCE($3, precio_venta_actual),
             estado = COALESCE($4, estado)
         WHERE id_maquina_producto = $5
         RETURNING *`,
        [capacidad_maxima, stock_actual, precio_venta_actual, estado, id]
    );
    return rows[0];
}

export const deleteMaquinaProducto = async (id: number) => {
    await pool.query('DELETE FROM maquina_productos WHERE id_maquina_producto = $1', [id]);
}
