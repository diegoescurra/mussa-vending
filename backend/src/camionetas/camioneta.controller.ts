import { AppError } from '../utils/AppError.js';
import type { RequestHandler } from 'express';
import { parseHistoryMaxId } from '../utils/historyPage.js';
import { deleteCamioneta, getAllCamionetas, getCamionetaById, saveCamioneta } from './camioneta.service.js';
import { createCargaCamioneta, getInventarioCamioneta, getMovimientosCamioneta } from './camioneta-inventario.service.js';
import { validateCamionetaBody, validateCargaBody } from './camioneta.validation.js';

const parseId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw new AppError('ID de camioneta invalido', 400);
  return id;
};

export const getCamionetasController: RequestHandler = async (_req, res) => {
  res.json({ status: 'success', data: await getAllCamionetas() });
};

export const getCamionetaController: RequestHandler = async (req, res) => {
  res.json({ status: 'success', data: await getCamionetaById(parseId(req.params.id)) });
};

export const createCamionetaController: RequestHandler = async (req, res) => {
  res.status(201).json({ status: 'success', data: await saveCamioneta(validateCamionetaBody(req.body)) });
};

export const updateCamionetaController: RequestHandler = async (req, res) => {
  const id = parseId(req.params.id);
  res.json({ status: 'success', data: await saveCamioneta(validateCamionetaBody(req.body), id) });
};

export const deleteCamionetaController: RequestHandler = async (req, res) => {
  await deleteCamioneta(parseId(req.params.id));
  res.status(204).send();
};

export const getInventarioCamionetaController: RequestHandler = async (req, res) => {
  res.json({ status: 'success', data: await getInventarioCamioneta(parseId(req.params.id)) });
};

export const getMovimientosCamionetaController: RequestHandler = async (req, res) => {
  const data = await getMovimientosCamioneta(parseId(req.params.id), parseHistoryMaxId(req.query.antes_de));
  res.json({ status: 'success', data });
};

export const createCargaCamionetaController: RequestHandler = async (req, res) => {
  const movimiento = await createCargaCamioneta(parseId(req.params.id), validateCargaBody(req.body));
  res.status(201).json({ status: 'success', data: movimiento });
};
