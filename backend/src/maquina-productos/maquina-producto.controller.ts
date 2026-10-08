import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
    createMaquinaProducto,
    deleteMaquinaProducto,
    getAllMaquinaProductos,
    getMaquinaProductoById,
    updateMaquinaProducto,
} from "./maquina-producto.service.js";
import { validateMaquinaProducto, validateMaquinaProductoId } from "./maquina-producto.validation.js";

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
    validateMaquinaProducto(req.body, true);
    const newMaquinaProducto = await createMaquinaProducto(req.body);

    res.status(201).json({
        status: 'success',
        data: newMaquinaProducto,
    });
})

export const updateMaquinaProductoController = asyncHandler(async (req, res) => {
    if (typeof req.params.id !== 'string' || !/^\d+$/.test(req.params.id)) {
        throw new AppError('Seleccione una asignacion valida', 400);
    }
    const id = Number(req.params.id);
    validateMaquinaProductoId(id);
    validateMaquinaProducto(req.body, false);
    const updatedMaquinaProducto = await updateMaquinaProducto(req.body, id);

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
