import { AppError } from "../utils/AppError.js";
import type { RequestHandler } from 'express';
import {
    createMaquinaProducto,
    deleteMaquinaProducto,
    getAllMaquinaProductos,
    getMaquinaProductoById,
    updateMaquinaProducto,
} from "./maquina-producto.service.js";
import { validateMaquinaProductoBody, validateMaquinaProductoId } from "./maquina-producto.validation.js";

export const getMaquinaProductosController: RequestHandler = async (_req, res) => {
    const maquinaProductos = await getAllMaquinaProductos();
    res.json({
        status: 'success',
        data: maquinaProductos,
    });
};

export const getMaquinaProductoByIdController: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const maquinaProducto = await getMaquinaProductoById(id);

    if (!maquinaProducto) {
        throw new AppError('Producto de maquina no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: maquinaProducto,
    });
};

export const createMaquinaProductoController: RequestHandler = async (req, res) => {
    const payload = validateMaquinaProductoBody(req.body, true);
    const newMaquinaProducto = await createMaquinaProducto(payload);

    res.status(201).json({
        status: 'success',
        data: newMaquinaProducto,
    });
};

export const updateMaquinaProductoController: RequestHandler = async (req, res) => {
    if (typeof req.params.id !== 'string' || !/^\d+$/.test(req.params.id)) {
        throw new AppError('Seleccione una asignacion valida', 400);
    }
    const id = Number(req.params.id);
    validateMaquinaProductoId(id);
    const payload = validateMaquinaProductoBody(req.body, false);
    const updatedMaquinaProducto = await updateMaquinaProducto(payload, id);

    res.json({
        status: 'success',
        data: updatedMaquinaProducto,
    });
};

export const deleteMaquinaProductoController: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    await deleteMaquinaProducto(id);

    res.status(204).json({
        status: 'success',
        data: null,
    });
};
