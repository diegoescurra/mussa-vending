import { Router } from "express";
import {
    createProveedorController,
    deleteProveedorController,
    getProveedorByIdController,
    getProveedoresController,
    updateProveedorController,
} from "./proveedor.controller.js";

const router = Router();

router.get('/proveedores', getProveedoresController);
router.get('/proveedores/:id', getProveedorByIdController);
router.post('/proveedores', createProveedorController);
router.put('/proveedores/:id', updateProveedorController);
router.delete('/proveedores/:id', deleteProveedorController);

export default router;
