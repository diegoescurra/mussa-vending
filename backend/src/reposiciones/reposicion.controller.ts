import type { RequestHandler } from 'express';
import { createReposicion } from './reposicion.service.js';
import { validateReposicionBody } from './reposicion.validation.js';

export const createReposicionController: RequestHandler = async (req, res) => {
  const reposicion = await createReposicion(validateReposicionBody({ ...req.body, id_repartidor: req.user!.id_usuario }));

  res.status(201).json({
    status: 'success',
    data: reposicion,
  });
};
