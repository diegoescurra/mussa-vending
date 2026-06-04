import { Router } from 'express';
import {
  createMaquinaController,
  deleteMaquinaController,
  getMaquinaByIdController,
  getMaquinasController,
  updateMaquinaController,
} from './controllers.maquina.js';

const router = Router();

router.get('/maquinas', getMaquinasController);
router.get('/maquinas/:id', getMaquinaByIdController);
router.post('/maquinas', createMaquinaController);
router.put('/maquinas/:id', updateMaquinaController);
router.delete('/maquinas/:id', deleteMaquinaController);

export default router;

