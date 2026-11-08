import type { RequestHandler } from 'express';
import { parseHistoryMaxId } from '../utils/historyPage.js';
import { parsePositiveInt32 } from '../utils/int32.js';
import { createConteo, getConteos } from './conteo.service.js';
import { validateConteoBody } from './conteo.validation.js';

export const getConteosController: RequestHandler = async (req, res) => {
  const raw = req.query.id_camioneta;
  const id = raw === undefined
    ? undefined
    : parsePositiveInt32(raw, 'El identificador de camioneta debe ser un entero positivo valido');
  res.json({ status: 'success', data: await getConteos(id, parseHistoryMaxId(req.query.antes_de)) });
};

export const createConteoController: RequestHandler = async (req, res) => {
  const data = await createConteo(validateConteoBody({ ...req.body, id_responsable: req.user!.id_usuario }));
  res.status(201).json({ status: 'success', data });
};
