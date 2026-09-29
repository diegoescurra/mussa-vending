import { Router } from 'express';
import {
    createUsuarioController,
    deleteUsuarioController,
    getUsuarioByIdController,
    getUsuariosController,
    updateUsuarioController,
} from './usuario.controller.js';

const router = Router();

router.get('/usuarios', getUsuariosController);
router.get('/usuarios/:id', getUsuarioByIdController);
router.post('/usuarios', createUsuarioController);
router.put('/usuarios/:id', updateUsuarioController);
router.delete('/usuarios/:id', deleteUsuarioController);

export default router;
