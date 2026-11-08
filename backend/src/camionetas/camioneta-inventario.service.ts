import pool from '../config/db.js';
import * as repository from './camioneta-inventario.repository.js';
import type { CreateCargaDTO } from './camioneta-inventario.dto.js';
import { AppError } from '../utils/AppError.js';
import { historyPage } from '../utils/historyPage.js';
import { getCamionetaById } from './camioneta.service.js';

export const getInventarioCamioneta = async (id: number) => {
  await getCamionetaById(id);
  const rows = await repository.findInventory(id);
  return rows;
};

export const getMovimientosCamioneta = async (id: number, maxId: number) => {
  await getCamionetaById(id);
  const rows = await repository.findMovements(id, maxId);
  return historyPage(rows, (row) => row.id_movimiento);
};

export const createCargaCamioneta = async (id: number, carga: CreateCargaDTO) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mantiene la asignacion y los responsables estables hasta confirmar la entrega.
    const camionetas = await repository.lockTruck(client, id);
    const camioneta = camionetas[0];
    if (!camioneta) throw new AppError('Camioneta no encontrada', 404);
    if (!camioneta.estado) throw new AppError('La camioneta debe estar activa', 400);

    const usuarios = await repository.lockUsers(client, [carga.id_bodeguero, camioneta.id_repartidor]);
    const bodeguero = usuarios.find((usuario) => usuario.id_usuario === carga.id_bodeguero);
    const repartidor = usuarios.find((usuario) => usuario.id_usuario === camioneta.id_repartidor);
    if (!bodeguero?.estado || !['ADMIN', 'BODEGUERO'].includes(bodeguero.rol)) {
      throw new AppError('La entrega requiere un ADMIN o BODEGUERO activo', 400);
    }
    if (!repartidor?.estado || repartidor.rol !== 'REPONEDOR') {
      throw new AppError('El repartidor asignado debe estar activo y tener rol REPONEDOR', 400);
    }

    const productos = await repository.lockProduct(client, carga.id_producto);
    if (!productos.length) throw new AppError('Producto no encontrado', 404);
    if (!productos[0].estado) throw new AppError('El producto debe estar activo', 400);

    const bodega = await repository.deductWarehouseStock(client, carga.cantidad, carga.id_producto);
    if (!bodega.length) throw new AppError('Stock insuficiente en bodega central', 409);

    await repository.ensureTruckStock(client, id, carga.id_producto);
    const inventario = await repository.addTruckStock(client, carga.cantidad, id, carga.id_producto);
    if (!inventario.length) throw new AppError('El saldo de camioneta supera el rango permitido', 409);

    const descripcion = `Entrega a ${camioneta.nombre} (${camioneta.patente}); recibe ${repartidor.nombre} ${repartidor.apellido}; valida ${bodeguero.nombre} ${bodeguero.apellido}`;
    const observacion = carga.observacion ? `${descripcion}. ${carga.observacion}` : descripcion;
    const movimientosBodega = await repository.insertWarehouseMovement(client, carga, bodega[0].stock_actual, observacion);
    const movimiento = await repository.insertTruckMovement(client, id, carga, {
      idRepartidor: camioneta.id_repartidor,
      idMovimientoBodega: movimientosBodega[0].id_movimiento,
      stockFinal: inventario[0].stock_actual,
    });
    await client.query('COMMIT');
    return movimiento;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
