import { Router } from 'express';
import {
  createMovimientoBodegaController,
  getInventarioBodegaController,
  getMovimientosBodegaController,
} from './bodega.controller.js';

const router = Router();

router.get('/bodega', getInventarioBodegaController);
router.get('/bodega/movimientos', getMovimientosBodegaController);
router.post('/bodega/movimientos', createMovimientoBodegaController);

export default router;
