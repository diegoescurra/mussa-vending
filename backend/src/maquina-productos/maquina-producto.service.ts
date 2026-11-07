import * as repository from './maquina-producto.repository.js';
import { AppError } from "../utils/AppError.js";
import type { CreateMaquinaProductoDTO, UpdateMaquinaProductoDTO } from "./maquina-producto.dto.js";

const validateStockCapacity = (stock: number, capacity: number) => {
    if (stock > capacity) {
        throw new AppError('Stock actual no puede superar la capacidad maxima', 400);
    }
};

const translateWriteError = (error: unknown): never => {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        if (error.code === '23505') {
            throw new AppError('Producto ya asignado a esta maquina', 409);
        }
        if (error.code === '23503') {
            throw new AppError('La maquina o el producto no existe', 400);
        }
        if (error.code === '23514' && 'constraint' in error) {
            const messages: Record<string, string> = {
                capacidad_maxima_check: 'Capacidad maxima debe ser mayor o igual a 0',
                stock_actual_check: 'Stock actual debe estar entre 0 y la capacidad maxima',
                check: 'Stock actual debe estar entre 0 y la capacidad maxima',
                precio_venta_actual_check: 'Precio actual debe ser mayor o igual a 0',
            };
            for (const [check, message] of Object.entries(messages)) {
                if (error.constraint === `maquina_productos_${check}` || error.constraint === `maquinas_productos_${check}`) {
                    throw new AppError(message, 400);
                }
            }
        }
    }
    throw error;
};

export const getAllMaquinaProductos = repository.findAll;

export const getMaquinaProductoById = repository.findById;

export const createMaquinaProducto = async (maquinaProducto: CreateMaquinaProductoDTO) => {
    validateStockCapacity(maquinaProducto.stock_actual, maquinaProducto.capacidad_maxima);
    try {
        return await repository.insert(maquinaProducto);
    } catch (error) {
        translateWriteError(error);
    }
}

export const updateMaquinaProducto = async (maquinaProducto: UpdateMaquinaProductoDTO, id: number) => {
    const { capacidad_maxima, stock_actual, precio_venta_actual, version } = maquinaProducto;
    const hasCompleteStock = stock_actual !== undefined && capacidad_maxima !== undefined;
    if (hasCompleteStock) {
        validateStockCapacity(stock_actual, capacidad_maxima);
    }

    const oldMaquinaProducto = await getMaquinaProductoById(id);

    if (!oldMaquinaProducto) {
        throw new AppError('Producto de maquina no encontrado', 404);
    }
    if (oldMaquinaProducto.version !== version) {
        throw new AppError('El inventario cambio; cierre el formulario y vuelva a abrirlo antes de guardar', 409);
    }

    if (!hasCompleteStock) {
        validateStockCapacity(
            stock_actual ?? Number(oldMaquinaProducto.stock_actual),
            capacidad_maxima ?? Number(oldMaquinaProducto.capacidad_maxima),
        );
    }
    if (precio_venta_actual === undefined && !Number.isFinite(Number(oldMaquinaProducto.precio_venta_actual))) {
        throw new AppError('Corrija el precio actual del inventario antes de guardar', 400);
    }

    try {
        const updated = await repository.update(maquinaProducto, id);
        if (!updated) throw new AppError('El inventario cambio; cierre el formulario y vuelva a abrirlo antes de guardar', 409);
        return updated;
    } catch (error) {
        translateWriteError(error);
    }
}

export const deleteMaquinaProducto = async (id: number) => {
    if (!await repository.remove(id)) throw new AppError('Producto de maquina no encontrado', 404);
};
