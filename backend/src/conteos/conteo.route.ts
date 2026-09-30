import { Router } from 'express';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { createConteo, getConteos, validateConteoId } from './conteo.service.js';

const router = Router();

router.get('/conteos', asyncHandler(async (req, res) => {
  const raw = req.query.id_camioneta;
  let id: number | undefined;
  if (raw !== undefined) {
    if (typeof raw !== 'string' || !/^\d+$/.test(raw) || !validateConteoId(Number(raw))) {
      throw new AppError('El identificador de camioneta debe ser un entero positivo valido', 400);
    }
    id = Number(raw);
  }
  res.json({ status: 'success', data: await getConteos(id) });
}));

router.post('/conteos', asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', data: await createConteo(req.body) });
}));

export default router;
