import * as repository from './proveedor.repository.js';
import { AppError } from "../utils/AppError.js";
import type { CreateProveedorDTO, UpdateProveedorDTO } from "./proveedor.dto.js";

export const getAllProveedores = repository.findAll;

export const getProveedorById = repository.findById;

export const createProveedor = async (proveedor: CreateProveedorDTO) => {
    try {
        return await repository.insert(proveedor);
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            throw new AppError('Ya existe un proveedor con ese nombre', 409);
        }
        throw error;
    }
}

export const updateProveedor = async (proveedor: UpdateProveedorDTO, id: number) => {
    try {
        const updated = await repository.update(proveedor, id);
        if (!updated) throw new AppError('Proveedor no encontrado', 404);
        return updated;
    } catch (error) {
        if ((error as { code?: string })?.code === '23505') {
            throw new AppError('Ya existe un proveedor con ese nombre', 409);
        }
        throw error;
    }
}

export const deleteProveedor = async (id: number) => {
    if (!await repository.remove(id)) throw new AppError('Proveedor no encontrado', 404);
};
