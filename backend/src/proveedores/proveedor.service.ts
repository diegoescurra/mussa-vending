import pool from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import type { CreateProveedorDTO, UpdateProveedorDTO } from "./provedoor.type.js";

export const getAllProveedores = async () => {
    const { rows } = await pool.query('SELECT * FROM proveedores');
    return rows;
}

export const getProveedorById = async (id: number) => {
    const { rows } = await pool.query('SELECT * FROM proveedores WHERE id_proveedor = $1', [id]);
    return rows[0];
}

export const createProveedor = async (proveedor: CreateProveedorDTO) => {
    const { nombre } = proveedor;
    try {
        const { rows } = await pool.query(
            'INSERT INTO proveedores (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        return rows[0];
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            throw new AppError('Ya existe un proveedor con ese nombre', 409);
        }
        throw error;
    }
}

export const updateProveedor = async (proveedor: UpdateProveedorDTO, id: number) => {
    const { nombre, estado } = proveedor;
    const oldProveedor = await getProveedorById(id);

    if (!oldProveedor) {
        throw new AppError('Proveedor no encontrado', 404);
    }

    try {
        const { rows } = await pool.query(
            'UPDATE proveedores SET nombre = $1, estado = $2 WHERE id_proveedor = $3 RETURNING *',
            [nombre, estado, id]
        );
        if (!rows[0]) throw new AppError('Proveedor no encontrado', 404);
        return rows[0];
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            throw new AppError('Ya existe un proveedor con ese nombre', 409);
        }
        throw error;
    }
}

export const deleteProveedor = async (id: number) => {
    await pool.query('DELETE FROM proveedores WHERE id_proveedor = $1', [id]);
}
