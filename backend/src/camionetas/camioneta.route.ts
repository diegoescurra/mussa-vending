import { Router } from 'express';
import {
  createCamionetaController,
  deleteCamionetaController,
  getCamionetaController,
  getCamionetasController,
  updateCamionetaController,
  getInventarioCamionetaController,
  getMovimientosCamionetaController,
  createCargaCamionetaController,
} from './camioneta.controller.js';

const router = Router();
router.get('/camionetas', getCamionetasController);
router.get('/camionetas/:id', getCamionetaController);
router.post('/camionetas', createCamionetaController);
router.put('/camionetas/:id', updateCamionetaController);
router.delete('/camionetas/:id', deleteCamionetaController);
router.get('/camionetas/:id/inventario', getInventarioCamionetaController);
router.get('/camionetas/:id/movimientos', getMovimientosCamionetaController);
router.post('/camionetas/:id/cargas', createCargaCamionetaController);
export default router;
