import type { RequestHandler } from 'express';
import { parseHistoryMaxId } from '../utils/historyPage.js';
import { createMovimientoBodega, getInventarioBodega, getMovimientosBodega } from './bodega.service.js';
import { validateMovimientoBody } from './bodega.validation.js';

export const getInventarioBodegaController: RequestHandler = async (_req, res) => {
  res.json({ status: 'success', data: await getInventarioBodega() });
};

export const getMovimientosBodegaController: RequestHandler = async (req, res) => {
  res.json({ status: 'success', data: await getMovimientosBodega(parseHistoryMaxId(req.query.antes_de)) });
};

export const createMovimientoBodegaController: RequestHandler = async (req, res) => {
  const movimiento = await createMovimientoBodega(validateMovimientoBody(req.body));
  res.status(201).json({ status: 'success', data: movimiento });
};
