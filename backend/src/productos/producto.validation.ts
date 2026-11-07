import { AppError } from '../utils/AppError.js';
import type { ProductoWriteDTO } from './producto.dto.js';

const MAX_IMPORTE = 9999999999.99; // numeric(12, 2)

const validateImporte = (value: unknown, label: string): number => {
    const amount = typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())
        ? Number(value)
        : value;

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > MAX_IMPORTE) {
        throw new AppError(`${label} debe ser un número entre 0 y ${MAX_IMPORTE}`, 400);
    }

    return amount;
};

export const validateProductoBody = (body: unknown): ProductoWriteDTO => {
    const { nombre, id_proveedor, precio_venta, costo_compra } = (body ?? {}) as Partial<ProductoWriteDTO>;

    if (!nombre || id_proveedor === undefined || precio_venta === undefined || costo_compra === undefined) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

    return {
        nombre,
        id_proveedor,
        precio_venta: validateImporte(precio_venta, 'Precio de venta'),
        costo_compra: validateImporte(costo_compra, 'Costo de compra'),
    };
};
