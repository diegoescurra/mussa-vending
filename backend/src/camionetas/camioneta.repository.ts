import pool from '../config/db.js';

const camionetaSelect = `SELECT c.id_camioneta, c.patente, c.nombre, c.id_repartidor, c.estado, c.fecha_creacion, u.nombre AS repartidor_nombre, u.apellido AS repartidor_apellido,
  (u.estado AND u.rol = 'REPONEDOR') AS repartidor_activo
  FROM camionetas c JOIN usuarios u ON u.id_usuario = c.id_repartidor`;

export const findAll = async () => {
  const { rows } = await pool.query(`${camionetaSelect} ORDER BY c.id_camioneta`);
  return rows;
};

export const findById = async (id: number) => {
  const { rows } = await pool.query(`${camionetaSelect} WHERE c.id_camioneta = $1`, [id]);
  return rows;
};

export const insert = async (patente: string, nombre: string, idRepartidor: number, estado: boolean) => {
  const { rows } = await pool.query(
    `INSERT INTO camionetas (patente, nombre, id_repartidor, estado)
     SELECT $1, $2, u.id_usuario, $4 FROM usuarios u
     WHERE u.id_usuario = $3 AND u.rol = 'REPONEDOR' AND u.estado = true
     RETURNING id_camioneta, patente, nombre, id_repartidor, estado, fecha_creacion`,
    [patente, nombre, idRepartidor, estado],
  );
  return rows;
};

export const update = async (id: number, patente: string, nombre: string, idRepartidor: number, estado: boolean) => {
  const { rows } = await pool.query(
    `UPDATE camionetas c SET patente = $1, nombre = $2, id_repartidor = u.id_usuario, estado = $4
     FROM usuarios u WHERE c.id_camioneta = $5 AND u.id_usuario = $3
     AND u.rol = 'REPONEDOR' AND u.estado = true RETURNING c.id_camioneta, c.patente, c.nombre, c.id_repartidor, c.estado, c.fecha_creacion`,
    [patente, nombre, idRepartidor, estado, id],
  );
  return rows;
};

export const remove = async (id: number) => {
  const { rows } = await pool.query('DELETE FROM camionetas WHERE id_camioneta = $1 RETURNING id_camioneta', [id]);
  return rows;
};
