import { Router } from 'express';
import { createReposicionController } from './reposicion.controller.js';

const router = Router();

router.post('/reposiciones', createReposicionController);

export default router;
