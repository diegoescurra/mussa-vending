import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
    createMaquinaProducto,
    deleteMaquinaProducto,
    getAllMaquinaProductos,
    getMaquinaProductoById,
    updateMaquinaProducto,
} from "./maquina-producto.service.js";
import type { CreateMaquinaProductoDTO, UpdateMaquinaProductoDTO } from "./maquina-producto.type.js";

export const getMaquinaProductosController = asyncHandler(async (_req, res) => {
    const maquinaProductos = await getAllMaquinaProductos();
    res.json({
        status: 'success',
        data: maquinaProductos,
    });
})

export const getMaquinaProductoByIdController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const maquinaProducto = await getMaquinaProductoById(id);

    if (!maquinaProducto) {
        throw new AppError('Producto de maquina no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: maquinaProducto,
    });
})

export const createMaquinaProductoController = asyncHandler(async (req, res) => {
    const { id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual } = req.body;

    if (!id_maquina || !id_producto || capacidad_maxima === undefined || stock_actual === undefined || precio_venta_actual === undefined) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

    const newMaquinaProducto = await createMaquinaProducto({
        id_maquina,
        id_producto,
        capacidad_maxima,
        stock_actual,
        precio_venta_actual,
    } as CreateMaquinaProductoDTO);

    res.status(201).json({
        status: 'success',
        data: newMaquinaProducto,
    });
})

export const updateMaquinaProductoController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { capacidad_maxima, stock_actual, precio_venta_actual, estado } = req.body;

    if (capacidad_maxima === undefined && stock_actual === undefined && precio_venta_actual === undefined && estado === undefined) {
        throw new AppError('Debe enviar al menos un campo para actualizar', 400);
    }

    const updatedMaquinaProducto = await updateMaquinaProducto({
        capacidad_maxima,
        stock_actual,
        precio_venta_actual,
        estado,
    } as UpdateMaquinaProductoDTO, id);

    res.json({
        status: 'success',
        data: updatedMaquinaProducto,
    });
})

export const deleteMaquinaProductoController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const maquinaProducto = await getMaquinaProductoById(id);

    if (!maquinaProducto) {
        throw new AppError('Producto de maquina no encontrado', 404);
    }

    await deleteMaquinaProducto(id);

    res.status(204).json({
        status: 'success',
        data: null,
    });
})
