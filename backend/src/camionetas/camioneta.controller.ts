import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { deleteCamioneta, getAllCamionetas, getCamionetaById, saveCamioneta } from './camioneta.service.js';
import { createCargaCamioneta, getInventarioCamioneta, getMovimientosCamioneta } from './camioneta-inventario.service.js';

const parseId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw new AppError('ID de camioneta invalido', 400);
  return id;
};

export const getCamionetasController = asyncHandler(async (_req, res) => {
  res.json({ status: 'success', data: await getAllCamionetas() });
});

export const getCamionetaController = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await getCamionetaById(parseId(req.params.id)) });
});

export const createCamionetaController = asyncHandler(async (req, res) => {
  res.status(201).json({ status: 'success', data: await saveCamioneta(req.body) });
});

export const updateCamionetaController = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await saveCamioneta(req.body, parseId(req.params.id)) });
});

export const deleteCamionetaController = asyncHandler(async (req, res) => {
  await deleteCamioneta(parseId(req.params.id));
  res.status(204).send();
});

export const getInventarioCamionetaController = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await getInventarioCamioneta(parseId(req.params.id)) });
});

export const getMovimientosCamionetaController = asyncHandler(async (req, res) => {
  res.json({ status: 'success', data: await getMovimientosCamioneta(parseId(req.params.id)) });
});

export const createCargaCamionetaController = asyncHandler(async (req, res) => {
  const movimiento = await createCargaCamioneta(parseId(req.params.id), req.body);
  res.status(201).json({ status: 'success', data: movimiento });
});
