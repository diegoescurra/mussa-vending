import pool from '../config/db.js';
import type { CreateProveedorDTO, UpdateProveedorDTO } from './proveedor.dto.js';
import type { Proveedor } from './provedoor.type.js';

const columns = 'id_proveedor, nombre, estado, fecha_creacion';

export const findAll = async () => {
  const { rows } = await pool.query<Proveedor>(`SELECT ${columns} FROM proveedores`);
  return rows;
};

export const findById = async (id: number): Promise<Proveedor | undefined> => {
  const { rows } = await pool.query<Proveedor>(`SELECT ${columns} FROM proveedores WHERE id_proveedor = $1`, [id]);
  return rows[0];
};

export const insert = async ({ nombre }: CreateProveedorDTO) => {
  const { rows } = await pool.query<Proveedor>(
      `INSERT INTO proveedores (nombre) VALUES ($1) RETURNING ${columns}`,
      [nombre]
  );
  return rows[0];
};

export const update = async ({ nombre, estado }: UpdateProveedorDTO, id: number) => {
  const { rows } = await pool.query<Proveedor>(
      `UPDATE proveedores SET nombre = $1, estado = $2 WHERE id_proveedor = $3 RETURNING ${columns}`,
      [nombre, estado, id]
  );
  return rows[0];
};

export const remove = async (id: number) => {
  const { rowCount } = await pool.query('DELETE FROM proveedores WHERE id_proveedor = $1', [id]);
  return rowCount === 1;
};
