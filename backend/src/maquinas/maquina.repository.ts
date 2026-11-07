import pool from '../config/db.js';
import type { CreateMaquinaDTO, UpdateMaquinaDTO } from './maquina.dto.js';
import type { Maquina } from './type.maquina.js';

const columns = 'id_maquina, codigo, nombre, descripcion, ubicacion, estado, fecha_creacion, modelo, sistemas_pago';

export const findAll = async () => {
  const { rows } = await pool.query<Maquina>(`SELECT ${columns} FROM maquinas`);
  return rows;
};

export const findById = async (id: number): Promise<Maquina | undefined> => {
  const { rows } = await pool.query<Maquina>(`SELECT ${columns} FROM maquinas WHERE id_maquina = $1`, [id]);
  return rows[0];
};

export const insert = async ({ codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago }: CreateMaquinaDTO) => {
  const { rows } = await pool.query<Maquina>(
      `INSERT INTO maquinas (codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${columns}`,
      [codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago]
  );
  return rows[0];
};

export const update = async ({ codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago }: UpdateMaquinaDTO, id: number) => {
  const { rows } = await pool.query<Maquina>(
      `UPDATE maquinas SET codigo = $1, nombre = $2, descripcion = $3, ubicacion = $4, estado = $5, modelo = $6, sistemas_pago = $7 WHERE id_maquina = $8 RETURNING ${columns}`,
      [codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago, id]
  );
  return rows[0];
};

export const remove = async (id: number) => {
  const { rowCount } = await pool.query('DELETE FROM maquinas WHERE id_maquina = $1', [id]);
  return rowCount === 1;
};
