import { Router } from "express";
import {
    createMaquinaProductoController,
    deleteMaquinaProductoController,
    getMaquinaProductoByIdController,
    getMaquinaProductosController,
    updateMaquinaProductoController,
} from "./maquina-producto.controller.js";

const router = Router();

router.get('/maquina-productos', getMaquinaProductosController);
router.get('/maquina-productos/:id', getMaquinaProductoByIdController);
router.post('/maquina-productos', createMaquinaProductoController);
router.put('/maquina-productos/:id', updateMaquinaProductoController);
router.delete('/maquina-productos/:id', deleteMaquinaProductoController);

export default router;
