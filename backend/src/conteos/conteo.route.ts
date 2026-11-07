import { Router } from 'express';
import { createConteoController, getConteosController } from './conteo.controller.js';

const router = Router();

router.get('/conteos', getConteosController);
router.post('/conteos', createConteoController);

export default router;
