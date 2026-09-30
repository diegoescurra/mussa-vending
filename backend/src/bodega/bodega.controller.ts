import { asyncHandler } from '../utils/AsyncHandler.js';
import { createMovimientoBodega, getInventarioBodega, getMovimientosBodega } from './bodega.service.js';

export const getInventarioBodegaController = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: await getInventarioBodega() });
});

export const getMovimientosBodegaController = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: await getMovimientosBodega() });
});

export const createMovimientoBodegaController = asyncHandler(async (req, res) => {
  const movimiento = await createMovimientoBodega(req.body);
  res.status(201).json({ status: 'success', data: movimiento });
});
