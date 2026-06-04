import { Router } from 'express';
import routeMaquinas from '../maquinas/route.maquina.js';
import routeMaquinaProductos from '../maquina-productos/maquina-producto.route.js';
import routeProductos from '../productos/producto.route.js';
import routeProveedores from '../proveedores/proveedor.route.js';

const router = Router();

router.use(routeMaquinas);
router.use(routeMaquinaProductos);
router.use(routeProductos);
router.use(routeProveedores);

export default router;
