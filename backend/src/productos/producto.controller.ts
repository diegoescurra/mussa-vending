import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
  createProducto,
  deleteProducto,
  getAllProductos,
  getProductoById,
  updateProducto,
} from "./producto.service.js";
import type { CreateProductoDTO, Producto, UpdateProductoDTO } from "./producto.type.js";

export const getProductosController = asyncHandler(async (_req, res) => {
    const productos = await getAllProductos();
    res.json({
        status: 'success',
        data: productos
    })
})

export const getProductoByIdController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const producto = await getProductoById(id);

    if (!producto) {
        throw new AppError('Producto no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: producto
    });
})

export const createProductoController = asyncHandler(async (req, res) => {
    const { nombre, id_proveedor, precio_venta, costo_compra } = req.body;

    if (!nombre || id_proveedor === undefined || precio_venta === undefined || costo_compra === undefined) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

    const newProducto = await createProducto({
        nombre,
        precio_venta,
        costo_compra,
        id_proveedor,
    } as CreateProductoDTO);

    res.status(201).json({
        status: 'success',
        data: newProducto
    });
})

export const updateProductoController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { nombre, id_proveedor, precio_venta, costo_compra } = req.body;

    if (!nombre || id_proveedor === undefined || precio_venta === undefined || costo_compra === undefined) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

 
    const updatedProducto = await updateProducto({
        nombre,
        precio_venta,
        costo_compra,
        id_proveedor,
    } as UpdateProductoDTO, id as number);

    res.json({
        status: 'success',
        data: updatedProducto
    });
})

export const deleteProductoController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const producto = await getProductoById(id);

    if (!producto) {
        throw new AppError('Producto no encontrado', 404);
    }

    await deleteProducto(id);

    res.status(204).json({
        status: 'success',
        data: null
    });
})
