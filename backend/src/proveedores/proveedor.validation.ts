import { AppError } from '../utils/AppError.js';

export const validateProveedorId = (value: unknown): number => {
    const id = Number(value);
    if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
        throw new AppError('El ID del proveedor debe ser un entero positivo valido', 400);
    }
    return id;
};

export const validateProveedorBody = (body: unknown, updating = false) => {
    const { nombre, estado } = (body ?? {}) as Record<string, unknown>;
    if (nombre === undefined || (updating && estado === undefined)) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }
    if (typeof nombre !== 'string' || !nombre.trim()) {
        throw new AppError('El nombre del proveedor es obligatorio', 400);
    }
    if (updating && typeof estado !== 'boolean') {
        throw new AppError('El estado del proveedor debe ser booleano', 400);
    }
    return { nombre: nombre.trim(), estado: estado as boolean };
};
