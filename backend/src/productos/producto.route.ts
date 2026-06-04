import { Router } from "express";
import {
  createProductoController,
  deleteProductoController,
  getProductoByIdController,
  getProductosController,
  updateProductoController,
} from "./producto.controller.js";



const router = Router();

router.get('/productos', getProductosController);
router.get('/productos/:id', getProductoByIdController);
router.post('/productos', createProductoController);
router.put('/productos/:id', updateProductoController);
router.delete('/productos/:id', deleteProductoController);

export default router;
