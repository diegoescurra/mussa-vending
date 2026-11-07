import { AppError } from "../utils/AppError.js";
import type { RequestHandler } from 'express';
import { parsePositiveInt32 } from "../utils/int32.js";
import {
  createProducto,
  deleteProducto,
  getAllProductos,
  getProductoById,
  updateProducto,
} from "./producto.service.js";
import { validateProductoBody } from "./producto.validation.js";

export const getProductosController: RequestHandler = async (_req, res) => {
    const productos = await getAllProductos();
    res.json({
        status: 'success',
        data: productos
    })
};

export const getProductoByIdController: RequestHandler = async (req, res) => {
    const id = parsePositiveInt32(req.params.id, 'ID de producto invalido');
    const producto = await getProductoById(id);

    if (!producto) {
        throw new AppError('Producto no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: producto
    });
};

export const createProductoController: RequestHandler = async (req, res) => {
    const newProducto = await createProducto(validateProductoBody(req.body));

    res.status(201).json({
        status: 'success',
        data: newProducto
    });
};

export const updateProductoController: RequestHandler = async (req, res) => {
    const id = parsePositiveInt32(req.params.id, 'ID de producto invalido');
    const updatedProducto = await updateProducto(validateProductoBody(req.body), id);

    res.json({
        status: 'success',
        data: updatedProducto
    });
};

export const deleteProductoController: RequestHandler = async (req, res) => {
    const id = parsePositiveInt32(req.params.id, 'ID de producto invalido');
    await deleteProducto(id);

    res.status(204).json({
        status: 'success',
        data: null
    });
};
