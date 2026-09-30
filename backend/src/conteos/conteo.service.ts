import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';

type CreateConteoDTO = {
  id_responsable: number;
  id_producto: number;
  stock_fisico: number;
  id_camioneta?: number;
  observacion?: string;
};

export const validateConteoId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647;

export const getConteos = async (idCamioneta?: number) => {
  if (idCamioneta !== undefined && !validateConteoId(idCamioneta)) {
    throw new AppError('El identificador de camioneta debe ser un entero positivo valido', 400);
  }
  if (idCamioneta !== undefined) {
    const { rows } = await pool.query('SELECT id_camioneta FROM camionetas WHERE id_camioneta = $1', [idCamioneta]);
    if (!rows.length) throw new AppError('Camioneta no encontrada', 404);
  }
  const { rows } = await pool.query(
    `SELECT c.*, p.nombre AS producto_nombre,
            concat_ws(' ', u.nombre, u.apellido) AS responsable_nombre
     FROM conteos c
     JOIN productos p ON p.id_producto = c.id_producto
     JOIN usuarios u ON u.id_usuario = c.id_responsable
     WHERE ${idCamioneta === undefined ? 'c.id_camioneta IS NULL' : 'c.id_camioneta = $1'}
     ORDER BY c.id_conteo DESC`,
    idCamioneta === undefined ? [] : [idCamioneta],
  );
  return rows;
};

export const createConteo = async (conteo: CreateConteoDTO) => {
  if (!conteo || !validateConteoId(conteo.id_responsable) || !validateConteoId(conteo.id_producto)
    || (conteo.id_camioneta !== undefined && !validateConteoId(conteo.id_camioneta))
    || !Number.isInteger(conteo.stock_fisico) || conteo.stock_fisico < 0 || conteo.stock_fisico > 2147483647) {
    throw new AppError('Envia responsable y producto validos, y stock fisico entero entre 0 y 2147483647', 400);
  }
  if (conteo.observacion !== undefined && typeof conteo.observacion !== 'string') {
    throw new AppError('La observacion debe ser texto', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mismo orden de bloqueo que las cargas: camioneta, usuarios, producto, saldo.
    let idRepartidor: number | undefined;
    if (conteo.id_camioneta !== undefined) {
      const { rows } = await client.query(
        'SELECT id_camioneta, id_repartidor FROM camionetas WHERE id_camioneta = $1 FOR SHARE', [conteo.id_camioneta],
      );
      if (!rows.length) throw new AppError('Camioneta no encontrada', 404);
      idRepartidor = rows[0].id_repartidor;
    }
    const { rows: usuarios } = await client.query(
      `SELECT id_usuario, rol, estado FROM usuarios
       WHERE id_usuario = $1 ORDER BY id_usuario FOR SHARE`, [conteo.id_responsable],
    );
    const responsable = usuarios[0];
    if (!responsable?.estado || !(responsable.rol === 'ADMIN'
      || (conteo.id_camioneta !== undefined && responsable.rol === 'REPONEDOR' && responsable.id_usuario === idRepartidor))) {
      throw new AppError('El responsable debe ser un ADMIN activo o el REPONEDOR activo asignado a la camioneta', 400);
    }
    const { rows: productos } = await client.query(
      'SELECT id_producto FROM productos WHERE id_producto = $1 FOR SHARE', [conteo.id_producto],
    );
    if (!productos.length) throw new AppError('Producto no encontrado', 404);

    const isCentral = conteo.id_camioneta === undefined;
    const values = isCentral ? [conteo.id_producto] : [conteo.id_camioneta, conteo.id_producto];
    await client.query(isCentral
      ? 'INSERT INTO bodega_productos (id_producto) VALUES ($1) ON CONFLICT (id_producto) DO NOTHING'
      : `INSERT INTO camioneta_productos (id_camioneta, id_producto) VALUES ($1, $2)
         ON CONFLICT (id_camioneta, id_producto) DO NOTHING`, values);
    const { rows: saldos } = await client.query(isCentral
      ? 'SELECT stock_actual FROM bodega_productos WHERE id_producto = $1 FOR UPDATE'
      : 'SELECT stock_actual FROM camioneta_productos WHERE id_camioneta = $1 AND id_producto = $2 FOR UPDATE', values);
    const { rows } = await client.query(
      `INSERT INTO conteos (id_camioneta, id_producto, id_responsable, stock_esperado, stock_fisico, observacion)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [conteo.id_camioneta ?? null, conteo.id_producto, conteo.id_responsable, saldos[0].stock_actual,
        conteo.stock_fisico, conteo.observacion ?? null],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
