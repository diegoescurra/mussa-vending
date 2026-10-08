import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import type { CreateMaquinaProductoDTO, UpdateMaquinaProductoDTO } from "./maquina-producto.type.js";
import { validateMaquinaProducto, validateMaquinaProductoId } from "./maquina-producto.validation.js";

const translateWriteError = (error: unknown): never => {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        if (error.code === '23505') {
            throw new AppError('Producto ya asignado a esta maquina', 409);
        }
        if (error.code === '23503') {
            throw new AppError('La maquina o el producto no existe', 400);
        }
        if (error.code === '23514' && 'constraint' in error) {
            const messages: Record<string, string> = {
                capacidad_maxima_check: 'Capacidad maxima debe ser mayor o igual a 0',
                stock_actual_check: 'Stock actual debe estar entre 0 y la capacidad maxima',
                check: 'Stock actual debe estar entre 0 y la capacidad maxima',
                precio_venta_actual_check: 'Precio actual debe ser mayor o igual a 0',
            };
            for (const [check, message] of Object.entries(messages)) {
                if (error.constraint === `maquina_productos_${check}` || error.constraint === `maquinas_productos_${check}`) {
                    throw new AppError(message, 400);
                }
            }
        }
    }
    throw error;
};

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
    validateMaquinaProducto(maquinaProducto, true);
    const { id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual } = maquinaProducto;
    try {
        const { rows } = await pool.query(
            'INSERT INTO maquina_productos (id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual]
        );
        return rows[0];
    } catch (error) {
        translateWriteError(error);
    }
}

export const updateMaquinaProducto = async (maquinaProducto: UpdateMaquinaProductoDTO, id: number) => {
    validateMaquinaProductoId(id);
    validateMaquinaProducto(maquinaProducto, false);
    const { capacidad_maxima, stock_actual, precio_venta_actual, estado } = maquinaProducto;
    const oldMaquinaProducto = await getMaquinaProductoById(id);

    if (!oldMaquinaProducto) {
        throw new AppError('Producto de maquina no encontrado', 404);
    }

    // Only database values may be numeric strings; request values stay strictly typed.
    validateMaquinaProducto({
        capacidad_maxima: capacidad_maxima ?? Number(oldMaquinaProducto.capacidad_maxima),
        stock_actual: stock_actual ?? Number(oldMaquinaProducto.stock_actual),
        precio_venta_actual: precio_venta_actual ?? Number(oldMaquinaProducto.precio_venta_actual),
        estado: estado ?? oldMaquinaProducto.estado,
    }, false);

    try {
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
    } catch (error) {
        translateWriteError(error);
    }
}

export const deleteMaquinaProducto = async (id: number) => {
    await pool.query('DELETE FROM maquina_productos WHERE id_maquina_producto = $1', [id]);
}
