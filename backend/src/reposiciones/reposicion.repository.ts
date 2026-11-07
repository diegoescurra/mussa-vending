import type { PoolClient } from 'pg';
import type { CreateReposicionDTO, CreateReposicionDetalleDTO } from './reposicion.dto.js';

export const claimOperation = async (client: PoolClient, idOperacion: string, solicitud: string) => {
  const { rows } = await client.query(
    `INSERT INTO reposicion_operaciones (id_operacion, solicitud) VALUES ($1, $2::jsonb)
     ON CONFLICT (id_operacion) DO NOTHING RETURNING id_operacion`,
    [idOperacion, solicitud],
  );
  return rows;
};

export const findOperation = async (client: PoolClient, idOperacion: string, solicitud: string) => {
  const { rows } = await client.query(
    `SELECT solicitud = $2::jsonb AS coincide, respuesta FROM reposicion_operaciones WHERE id_operacion = $1`,
    [idOperacion, solicitud],
  );
  return rows;
};

export const lockTruckByDriver = async (client: PoolClient, idRepartidor: number) => {
  const { rows } = await client.query(
    'SELECT id_camioneta, estado FROM camionetas WHERE id_repartidor = $1 FOR SHARE',
    [idRepartidor],
  );
  return rows;
};

export const lockDriver = async (client: PoolClient, idRepartidor: number) => {
  const { rows } = await client.query(
    'SELECT rol, estado FROM usuarios WHERE id_usuario = $1 FOR SHARE', [idRepartidor],
  );
  return rows;
};

export const lockMachine = async (client: PoolClient, idMaquina: number) => {
  const { rows } = await client.query(
    'SELECT estado FROM maquinas WHERE id_maquina = $1 FOR SHARE', [idMaquina],
  );
  return rows;
};

export const lockSlot = async (client: PoolClient, idMaquinaProducto: number, idMaquina: number) => {
  const { rows } = await client.query(
    `SELECT id_maquina_producto, id_producto, stock_actual, capacidad_maxima, precio_venta_actual, estado, version
     FROM maquina_productos
     WHERE id_maquina_producto = $1 AND id_maquina = $2
     FOR UPDATE`,
    [idMaquinaProducto, idMaquina],
  );
  return rows;
};

export const deductTruckStock = async (client: PoolClient, cantidad: number, idCamioneta: number, idProducto: number) => {
  const { rows } = await client.query(
    `UPDATE camioneta_productos SET stock_actual = stock_actual - $1
     WHERE id_camioneta = $2 AND id_producto = $3 AND stock_actual >= $1
     RETURNING stock_actual`,
    [cantidad, idCamioneta, idProducto],
  );
  return rows;
};

export const insertRestock = async (
  client: PoolClient,
  reposicion: CreateReposicionDTO,
  idCamioneta: number,
  ventaEsperada: number,
  diferenciaDinero: number,
) => {
  const { rows } = await client.query(
    `INSERT INTO reposiciones (id_maquina, dinero_retirado, observacion, venta_esperada, diferencia_dinero, id_camioneta, id_repartidor)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_reposicion, id_maquina, dinero_retirado, observacion, venta_esperada,
               diferencia_dinero, fecha_creacion, id_camioneta, id_repartidor`,
    [
      reposicion.id_maquina, reposicion.dinero_retirado, reposicion.observacion ?? null,
      ventaEsperada, diferenciaDinero, idCamioneta, reposicion.id_repartidor,
    ],
  );
  return rows[0];
};

export const insertDetail = async (client: PoolClient, idReposicion: number, detalle: CreateReposicionDetalleDTO) => {
  await client.query(
    `INSERT INTO reposicion_detalles (
      id_reposicion, id_maquina_producto, stock_sistema, stock_encontrado,
      cantidad_vendida, cantidad_repuesta, cantidad_retirada, stock_final,
      precio_venta_actual, venta_esperada
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      idReposicion,
      detalle.id_maquina_producto,
      detalle.stock_sistema,
      detalle.stock_encontrado,
      detalle.cantidad_vendida,
      detalle.cantidad_repuesta,
      detalle.cantidad_retirada,
      detalle.stock_final,
      detalle.precio_venta_actual,
      detalle.venta_esperada,
    ],
  );
};

export const updateSlotStock = async (client: PoolClient, stockFinal: number, idMaquinaProducto: number) => {
  await client.query(
    'UPDATE maquina_productos SET stock_actual = $1 WHERE id_maquina_producto = $2',
    [stockFinal, idMaquinaProducto],
  );
};

export const insertTruckMovement = async (
  client: PoolClient,
  reposicion: CreateReposicionDTO,
  idCamioneta: number,
  idReposicion: number,
  salida: { id_producto: number; cantidad: number; stock_final: number },
) => {
  await client.query(
    `INSERT INTO camioneta_movimientos
     (id_camioneta, id_producto, id_repartidor, tipo, cantidad, stock_final, id_reposicion, id_maquina, observacion)
     VALUES ($1, $2, $3, 'SALIDA', $4, $5, $6, $7, $8)`,
    [idCamioneta, salida.id_producto, reposicion.id_repartidor, salida.cantidad,
      salida.stock_final, idReposicion, reposicion.id_maquina, reposicion.observacion ?? null],
  );
};

export const completeOperation = async (client: PoolClient, idOperacion: string, respuesta: string) => {
  await client.query('UPDATE reposicion_operaciones SET respuesta = $2::jsonb WHERE id_operacion = $1',
    [idOperacion, respuesta]);
};
