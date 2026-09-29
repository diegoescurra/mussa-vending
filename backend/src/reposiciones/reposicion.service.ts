import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { CreateReposicionDTO } from './reposicion.type.js';

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

const sameAmount = (left: number, right: number) => Math.abs(left - right) < 0.0001;

export const createReposicion = async (reposicion: CreateReposicionDTO) => {
  if (!reposicion || typeof reposicion !== 'object' || !Number.isInteger(reposicion.id_maquina) || reposicion.id_maquina <= 0) {
    throw new AppError('La maquina es obligatoria', 400);
  }

  if (!isNonNegativeNumber(reposicion.dinero_retirado) || !Array.isArray(reposicion.detalles) || reposicion.detalles.length === 0) {
    throw new AppError('Debe enviar dinero retirado y al menos un detalle', 400);
  }

  const detalleIds = new Set<number>();
  for (const detalle of reposicion.detalles) {
    if (!detalle || typeof detalle !== 'object') {
      throw new AppError('Los detalles de reposicion contienen valores invalidos', 400);
    }

    const values = [
      detalle.id_maquina_producto,
      detalle.stock_sistema,
      detalle.stock_encontrado,
      detalle.cantidad_vendida,
      detalle.cantidad_repuesta,
      detalle.cantidad_retirada,
      detalle.stock_final,
      detalle.precio_venta_actual,
      detalle.venta_esperada,
    ];

    if (!Number.isInteger(detalle.id_maquina_producto) || detalle.id_maquina_producto <= 0 || !isNonNegativeInteger(detalle.stock_sistema) || !isNonNegativeInteger(detalle.stock_encontrado) || !isNonNegativeInteger(detalle.cantidad_vendida) || !isNonNegativeInteger(detalle.cantidad_repuesta) || !isNonNegativeInteger(detalle.cantidad_retirada) || !isNonNegativeInteger(detalle.stock_final) || values.slice(7).some((value) => !isNonNegativeNumber(value))) {
      throw new AppError('Los detalles de reposicion contienen valores invalidos', 400);
    }

    if (detalleIds.has(detalle.id_maquina_producto)) {
      throw new AppError('Un producto de maquina solo puede incluirse una vez', 400);
    }

    detalleIds.add(detalle.id_maquina_producto);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const detallesCalculados = [];

    for (const detalle of reposicion.detalles) {
      const { rows } = await client.query(
        `SELECT id_maquina_producto, stock_actual, capacidad_maxima, precio_venta_actual
         FROM maquina_productos
         WHERE id_maquina_producto = $1 AND id_maquina = $2
         FOR UPDATE`,
        [detalle.id_maquina_producto, reposicion.id_maquina],
      );
      const inventario = rows[0];

      if (!inventario) {
        throw new AppError('Uno de los productos no pertenece a la maquina seleccionada', 400);
      }

      const stockSistema = Number(inventario.stock_actual);
      const capacidadMaxima = Number(inventario.capacidad_maxima);
      const precioVenta = Number(inventario.precio_venta_actual);
      const cantidadVendida = Math.max(stockSistema - detalle.stock_encontrado + detalle.cantidad_retirada, 0);
      const stockFinal = detalle.stock_encontrado + detalle.cantidad_repuesta - detalle.cantidad_retirada;
      const ventaEsperada = cantidadVendida * precioVenta;

      if (!sameAmount(detalle.stock_sistema, stockSistema)) {
        throw new AppError('El inventario fue actualizado; recargue la reposicion antes de guardar', 409);
      }

      if (detalle.stock_encontrado > capacidadMaxima || detalle.cantidad_retirada > detalle.stock_encontrado || stockFinal < 0 || stockFinal > capacidadMaxima) {
        throw new AppError('Las cantidades de reposicion no respetan el inventario de la maquina', 400);
      }

      detallesCalculados.push({
        ...detalle,
        cantidad_vendida: cantidadVendida,
        stock_final: stockFinal,
        precio_venta_actual: precioVenta,
        venta_esperada: ventaEsperada,
      });
    }

    const ventaEsperada = detallesCalculados.reduce((total, detalle) => total + detalle.venta_esperada, 0);
    const diferenciaDinero = reposicion.dinero_retirado - ventaEsperada;
    const { rows: reposiciones } = await client.query(
      `INSERT INTO reposiciones (id_maquina, dinero_retirado, observacion, venta_esperada, diferencia_dinero)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reposicion.id_maquina, reposicion.dinero_retirado, reposicion.observacion ?? null, ventaEsperada, diferenciaDinero],
    );
    const nuevaReposicion = reposiciones[0];

    for (const detalle of detallesCalculados) {
      await client.query(
        `INSERT INTO reposicion_detalles (
          id_reposicion, id_maquina_producto, stock_sistema, stock_encontrado,
          cantidad_vendida, cantidad_repuesta, cantidad_retirada, stock_final,
          precio_venta_actual, venta_esperada
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          nuevaReposicion.id_reposicion,
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
      await client.query(
        'UPDATE maquina_productos SET stock_actual = $1 WHERE id_maquina_producto = $2',
        [detalle.stock_final, detalle.id_maquina_producto],
      );
    }

    await client.query('COMMIT');
    return { ...nuevaReposicion, detalles: detallesCalculados };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
