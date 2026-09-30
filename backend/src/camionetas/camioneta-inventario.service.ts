import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { getCamionetaById } from './camioneta.service.js';

type CreateCargaDTO = {
  id_bodeguero: number;
  id_producto: number;
  cantidad: number;
  observacion?: string;
};

export const getInventarioCamioneta = async (id: number) => {
  await getCamionetaById(id);
  const { rows } = await pool.query(
    `SELECT p.id_producto, p.nombre AS producto_nombre, p.estado,
            COALESCE(cp.stock_actual, 0) AS stock_actual
     FROM productos p LEFT JOIN camioneta_productos cp
       ON cp.id_producto = p.id_producto AND cp.id_camioneta = $1
     ORDER BY p.nombre`,
    [id],
  );
  return rows;
};

export const getMovimientosCamioneta = async (id: number) => {
  await getCamionetaById(id);
  const { rows } = await pool.query(
    `SELECT m.*, p.nombre AS producto_nombre,
            concat_ws(' ', b.nombre, b.apellido) AS bodeguero_nombre,
            concat_ws(' ', r.nombre, r.apellido) AS repartidor_nombre
     FROM camioneta_movimientos m
     JOIN productos p ON p.id_producto = m.id_producto
     LEFT JOIN usuarios b ON b.id_usuario = m.id_bodeguero
     JOIN usuarios r ON r.id_usuario = m.id_repartidor
     WHERE m.id_camioneta = $1 ORDER BY m.id_movimiento DESC`,
    [id],
  );
  return rows;
};

export const createCargaCamioneta = async (id: number, carga: CreateCargaDTO) => {
  if (!carga || [carga.id_bodeguero, carga.id_producto, carga.cantidad]
    .some((value) => !Number.isInteger(value) || value <= 0 || value > 2147483647)) {
    throw new AppError('Debe enviar bodeguero, producto y cantidad entera positiva validos', 400);
  }
  if (carga.observacion !== undefined && typeof carga.observacion !== 'string') {
    throw new AppError('La observacion debe ser texto', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mantiene la asignacion y los responsables estables hasta confirmar la entrega.
    const { rows: camionetas } = await client.query(
      'SELECT * FROM camionetas WHERE id_camioneta = $1 FOR SHARE', [id],
    );
    const camioneta = camionetas[0];
    if (!camioneta) throw new AppError('Camioneta no encontrada', 404);
    if (!camioneta.estado) throw new AppError('La camioneta debe estar activa', 400);

    const { rows: usuarios } = await client.query(
      `SELECT id_usuario, nombre, apellido, rol, estado FROM usuarios
       WHERE id_usuario = ANY($1::integer[]) ORDER BY id_usuario FOR SHARE`,
      [[carga.id_bodeguero, camioneta.id_repartidor]],
    );
    const bodeguero = usuarios.find((usuario) => usuario.id_usuario === carga.id_bodeguero);
    const repartidor = usuarios.find((usuario) => usuario.id_usuario === camioneta.id_repartidor);
    if (!bodeguero?.estado || bodeguero.rol !== 'ADMIN') {
      throw new AppError('El bodeguero debe ser un usuario ADMIN activo', 400);
    }
    if (!repartidor?.estado || repartidor.rol !== 'REPONEDOR') {
      throw new AppError('El repartidor asignado debe estar activo y tener rol REPONEDOR', 400);
    }

    const { rows: productos } = await client.query(
      'SELECT id_producto, estado FROM productos WHERE id_producto = $1 FOR SHARE', [carga.id_producto],
    );
    if (!productos.length) throw new AppError('Producto no encontrado', 404);
    if (!productos[0].estado) throw new AppError('El producto debe estar activo', 400);

    const { rows: bodega } = await client.query(
      `UPDATE bodega_productos SET stock_actual = stock_actual - $1
       WHERE id_producto = $2 AND stock_actual >= $1 RETURNING stock_actual`,
      [carga.cantidad, carga.id_producto],
    );
    if (!bodega.length) throw new AppError('Stock insuficiente en bodega central', 409);

    await client.query(
      `INSERT INTO camioneta_productos (id_camioneta, id_producto) VALUES ($1, $2)
       ON CONFLICT (id_camioneta, id_producto) DO NOTHING`,
      [id, carga.id_producto],
    );
    const { rows: inventario } = await client.query(
      `UPDATE camioneta_productos SET stock_actual = (stock_actual::bigint + $1)::integer
       WHERE id_camioneta = $2 AND id_producto = $3
         AND stock_actual::bigint + $1 <= 2147483647 RETURNING stock_actual`,
      [carga.cantidad, id, carga.id_producto],
    );
    if (!inventario.length) throw new AppError('El saldo de camioneta supera el rango permitido', 409);

    const descripcion = `Entrega a ${camioneta.nombre} (${camioneta.patente}); recibe ${repartidor.nombre} ${repartidor.apellido}; valida ${bodeguero.nombre} ${bodeguero.apellido}`;
    const { rows: movimientosBodega } = await client.query(
      `INSERT INTO bodega_movimientos (id_producto, tipo, cantidad, stock_final, observacion)
       VALUES ($1, 'SALIDA', $2, $3, $4) RETURNING id_movimiento`,
      [carga.id_producto, carga.cantidad, bodega[0].stock_actual, carga.observacion ? `${descripcion}. ${carga.observacion}` : descripcion],
    );
    const { rows } = await client.query(
      `INSERT INTO camioneta_movimientos
       (id_camioneta, id_producto, id_bodeguero, id_repartidor, id_movimiento_bodega, cantidad, stock_final, observacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, carga.id_producto, carga.id_bodeguero, camioneta.id_repartidor,
        movimientosBodega[0].id_movimiento, carga.cantidad, inventario[0].stock_actual, carga.observacion ?? null],
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
