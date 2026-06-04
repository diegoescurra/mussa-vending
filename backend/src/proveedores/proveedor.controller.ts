import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
    createProveedor,
    deleteProveedor,
    getAllProveedores,
    getProveedorById,
    updateProveedor,
} from "./proveedor.service.js";
import type { CreateProveedorDTO, UpdateProveedorDTO } from "./provedoor.type.js";

export const getProveedoresController = asyncHandler(async (_req, res) => {
    const proveedores = await getAllProveedores();
    res.json({
        status: 'success',
        data: proveedores,
    });
})

export const getProveedorByIdController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const proveedor = await getProveedorById(id);

    if (!proveedor) {
        throw new AppError('Proveedor no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: proveedor,
    });
})

export const createProveedorController = asyncHandler(async (req, res) => {
    const { nombre } = req.body;

    if (!nombre) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

    const newProveedor = await createProveedor({ nombre } as CreateProveedorDTO);

    res.status(201).json({
        status: 'success',
        data: newProveedor,
    });
})

export const updateProveedorController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { nombre, estado } = req.body;

    if (!nombre || estado === undefined) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

    const updatedProveedor = await updateProveedor({ nombre, estado } as UpdateProveedorDTO, id);

    res.json({
        status: 'success',
        data: updatedProveedor,
    });
})

export const deleteProveedorController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const proveedor = await getProveedorById(id);

    if (!proveedor) {
        throw new AppError('Proveedor no encontrado', 404);
    }

    await deleteProveedor(id);

    res.status(204).json({
        status: 'success',
        data: null,
    });
})
