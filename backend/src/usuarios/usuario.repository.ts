import pool from '../config/db.js';
import type { CreateUsuarioDTO, UpdateUsuarioDTO } from './usuario.dto.js';
import type { UsuarioResponse } from './usuario.type.js';

const usuarioSelect = 'id_usuario, nombre, apellido, email, rol, estado, fecha_creacion';

export const findAll = async () => {
  const { rows } = await pool.query<UsuarioResponse>(`SELECT ${usuarioSelect} FROM usuarios`);
  return rows;
};

export const findById = async (id: number): Promise<UsuarioResponse | undefined> => {
  const { rows } = await pool.query<UsuarioResponse>(`SELECT ${usuarioSelect} FROM usuarios WHERE id_usuario = $1`, [id]);
  return rows[0];
};

export const insert = async ({ nombre, apellido, email, password_hash, rol }: CreateUsuarioDTO) => {
  const { rows } = await pool.query<UsuarioResponse>(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${usuarioSelect}`,
    [nombre, apellido, email, password_hash, rol]
  );
  return rows[0];
};

export const update = async ({ nombre, apellido, email, password_hash, rol, estado }: UpdateUsuarioDTO, id: number) => {
  const { rows } = await pool.query<UsuarioResponse>(
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
};

export const remove = async (id: number) => {
  const { rowCount } = await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
  return rowCount === 1;
};
