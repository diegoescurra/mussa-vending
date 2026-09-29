import { asyncHandler } from '../utils/AsyncHandler.js';
import { createReposicion } from './reposicion.service.js';
import type { CreateReposicionDTO } from './reposicion.type.js';

export const createReposicionController = asyncHandler(async (req, res) => {
  const reposicion = await createReposicion(req.body as CreateReposicionDTO);

  res.status(201).json({
    status: 'success',
    data: reposicion,
  });
});
