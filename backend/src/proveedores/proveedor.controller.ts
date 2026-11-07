import { AppError } from "../utils/AppError.js";
import type { RequestHandler } from 'express';
import {
    createProveedor,
    deleteProveedor,
    getAllProveedores,
    getProveedorById,
    updateProveedor,
} from "./proveedor.service.js";
import { validateProveedorBody, validateProveedorId } from './proveedor.validation.js';

export const getProveedoresController: RequestHandler = async (_req, res) => {
    const proveedores = await getAllProveedores();
    res.json({
        status: 'success',
        data: proveedores,
    });
};

export const getProveedorByIdController: RequestHandler = async (req, res) => {
    const id = validateProveedorId(req.params.id);
    const proveedor = await getProveedorById(id);

    if (!proveedor) {
        throw new AppError('Proveedor no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: proveedor,
    });
};

export const createProveedorController: RequestHandler = async (req, res) => {
    const { nombre } = validateProveedorBody(req.body);
    const newProveedor = await createProveedor({ nombre });

    res.status(201).json({
        status: 'success',
        data: newProveedor,
    });
};

export const updateProveedorController: RequestHandler = async (req, res) => {
    const id = validateProveedorId(req.params.id);
    const payload = validateProveedorBody(req.body, true);
    const updatedProveedor = await updateProveedor(payload, id);

    res.json({
        status: 'success',
        data: updatedProveedor,
    });
};

export const deleteProveedorController: RequestHandler = async (req, res) => {
    const id = validateProveedorId(req.params.id);
    await deleteProveedor(id);

    res.status(204).json({
        status: 'success',
        data: null,
    });
};
