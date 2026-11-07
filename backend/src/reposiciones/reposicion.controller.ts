import type { RequestHandler } from 'express';
import { createReposicion } from './reposicion.service.js';
import { validateReposicionBody } from './reposicion.validation.js';

export const createReposicionController: RequestHandler = async (req, res) => {
  const reposicion = await createReposicion(validateReposicionBody(req.body));

  res.status(201).json({
    status: 'success',
    data: reposicion,
  });
};
