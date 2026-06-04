import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { CreateMaquinaDTO, UpdateMaquinaDTO } from './type.maquina.js';

export const getAllMaquinas = async () => {
    const { rows } = await pool.query('SELECT * FROM maquinas');
    return rows;
}

export const getMaquinaById = async (id: number) => {
    const { rows } = await pool.query('SELECT * FROM maquinas WHERE id_maquina = $1', [id]);
    return rows[0];
}

export const createMaquina = async (maquina: CreateMaquinaDTO) => {
    const { codigo, nombre, descripcion, ubicacion, estado } = maquina;
    const { rows } = await pool.query(
        'INSERT INTO maquinas (codigo, nombre, descripcion, ubicacion, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [codigo, nombre, descripcion, ubicacion, estado]
    );
    return rows[0];
}

export const updateMaquina = async (maquina: UpdateMaquinaDTO, id: number) => {
    const { codigo, nombre, descripcion, ubicacion, estado } = maquina;
    const oldMaquina = await getMaquinaById(id);

    if (!oldMaquina) {
        throw new AppError('Maquina no encontrada', 404);
    }

    const { rows } = await pool.query(
        'UPDATE maquinas SET codigo = $1, nombre = $2, descripcion = $3, ubicacion = $4, estado = $5 WHERE id_maquina = $6 RETURNING *',
        [codigo, nombre, descripcion, ubicacion, estado, id]
    );
    return rows[0];
}

export const deleteMaquina = async (id: number) => {
    await pool.query('DELETE FROM maquinas WHERE id_maquina = $1', [id]);
}
