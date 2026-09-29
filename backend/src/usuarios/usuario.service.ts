import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { CreateUsuarioDTO, UpdateUsuarioDTO } from './usuario.type.js';

const usuarioSelect = 'id_usuario, nombre, apellido, email, rol, estado, fecha_creacion';

export const getAllUsuarios = async () => {
    const { rows } = await pool.query(`SELECT ${usuarioSelect} FROM usuarios`);
    return rows;
}

export const getUsuarioById = async (id: number) => {
    const { rows } = await pool.query(`SELECT ${usuarioSelect} FROM usuarios WHERE id_usuario = $1`, [id]);
    return rows[0];
}

export const getUsuarioByEmail = async (email: string) => {
    const { rows } = await pool.query(`SELECT ${usuarioSelect} FROM usuarios WHERE email = $1`, [email]);
    return rows[0];
}

export const createUsuario = async (usuario: CreateUsuarioDTO) => {
    const { nombre, apellido, email, password_hash, rol } = usuario;
    const oldUsuario = await getUsuarioByEmail(email);

    if (oldUsuario) {
        throw new AppError('Ya existe un usuario con ese email', 400);
    }

    const { rows } = await pool.query(
        `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${usuarioSelect}`,
        [nombre, apellido, email, password_hash, rol]
    );

    return rows[0];
}

export const updateUsuario = async (usuario: UpdateUsuarioDTO, id: number) => {
    const oldUsuario = await getUsuarioById(id);

    if (!oldUsuario) {
        throw new AppError('Usuario no encontrado', 404);
    }

    if (usuario.email && usuario.email !== oldUsuario.email) {
        const usuarioByEmail = await getUsuarioByEmail(usuario.email);

        if (usuarioByEmail) {
            throw new AppError('Ya existe un usuario con ese email', 400);
        }
    }

    const { nombre, apellido, email, password_hash, rol, estado } = usuario;
    const { rows } = await pool.query(
        `UPDATE usuarios
         SET nombre = COALESCE($1, nombre),
             apellido = COALESCE($2, apellido),
             email = COALESCE($3, email),
             password_hash = COALESCE($4, password_hash),
             rol = COALESCE($5, rol),
             estado = COALESCE($6, estado)
         WHERE id_usuario = $7
         RETURNING ${usuarioSelect}`,
        [nombre, apellido, email, password_hash, rol, estado, id]
    );

    return rows[0];
}

export const deleteUsuario = async (id: number) => {
    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
}
