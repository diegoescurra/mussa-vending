import pool from '../config/db.js';
import type { AuthUser } from './auth.types.js';
const fields = 'id_usuario, nombre, apellido, email, rol, estado, fecha_creacion, auth_version';

export async function findCredentials(email: string) {
  const { rows } = await pool.query<AuthUser & { password_hash: string }>(
    `SELECT ${fields}, password_hash FROM usuarios WHERE lower(btrim(email)) = $1`,
    [email],
  );
  return rows[0];
}
export async function findSessionUser(id: number) {
  const { rows } = await pool.query<AuthUser>(`SELECT ${fields} FROM usuarios WHERE id_usuario = $1`, [id]);
  return rows[0];
}
export async function replacePassword(id: number, version: number, hash: string) {
  const result = await pool.query(
    'UPDATE usuarios SET password_hash = $1, auth_version = auth_version + 1 WHERE id_usuario = $2 AND auth_version = $3 AND estado = true',
    [hash, id, version],
  );
  return result.rowCount === 1;
}
