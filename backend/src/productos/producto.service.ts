import { AppError } from '../utils/AppError.js';
import type { ProductoWriteDTO } from './producto.dto.js';
import * as repository from './producto.repository.js';

export const getAllProductos = repository.findAll;
export const getProductoOptions = repository.findOptions;
export const getProductoById = repository.findById;
const productWriteError = (error: unknown): never => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new AppError('Ya existe un producto con ese nombre.', 409);
    }
    throw error;
};

export const createProducto = async (producto: ProductoWriteDTO) => {
    try {
        return await repository.insert(producto);
    } catch (error) {
        return productWriteError(error);
    }
};

export const updateProducto = async (producto: ProductoWriteDTO, id: number) => {
    try {
        const updated = await repository.update(producto, id);
        if (!updated) throw new AppError('Producto no encontrado', 404);
        return updated;
    } catch (error) {
        return productWriteError(error);
    }
};

export const deleteProducto = async (id: number) => {
    try {
        if (!await repository.remove(id)) throw new AppError('Producto no encontrado', 404);
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
            throw new AppError('No se puede eliminar este producto porque esta asociado a inventario o tiene historial registrado.', 409);
        }
        throw error;
    }
};
