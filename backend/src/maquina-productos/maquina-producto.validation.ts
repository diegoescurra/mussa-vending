import { AppError } from '../utils/AppError.js';

const INT32_MAX = 2147483647;

export const validateMaquinaProductoId = (id: unknown, message = 'Seleccione una asignacion valida') => {
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || id > INT32_MAX) {
        throw new AppError(message, 400);
    }
};

export const validateMaquinaProducto = (body: unknown, create: boolean) => {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new AppError('Los datos enviados deben ser un objeto', 400);
    }
    const data = body as Record<string, unknown>;
    const fields = create
        ? ['id_maquina', 'id_producto', 'capacidad_maxima', 'stock_actual', 'precio_venta_actual']
        : ['capacidad_maxima', 'stock_actual', 'precio_venta_actual', 'estado'];

    if (create && fields.some(field => data[field] === undefined)) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }
    if (!create && !fields.some(field => field in data)) {
        throw new AppError('Debe enviar al menos un campo para actualizar', 400);
    }
    if (create) {
        validateMaquinaProductoId(data.id_maquina, 'Seleccione una maquina valida');
        validateMaquinaProductoId(data.id_producto, 'Seleccione un producto valido');
    }
    for (const field of ['capacidad_maxima', 'stock_actual']) {
        if (create || field in data) {
            const value = data[field];
            if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > INT32_MAX) {
                const label = field === 'capacidad_maxima' ? 'Capacidad maxima' : 'Stock actual';
                throw new AppError(`${label} debe ser un entero entre 0 y ${INT32_MAX}`, 400);
            }
        }
    }
    if (create || 'precio_venta_actual' in data) {
        const price = data.precio_venta_actual;
        if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 9999999999.99 || price !== Number(price.toFixed(2))) {
            throw new AppError('Precio actual debe estar entre 0 y 9999999999.99 y tener hasta 2 decimales', 400);
        }
    }
    if (!create && 'estado' in data && typeof data.estado !== 'boolean') {
        throw new AppError('Estado debe ser verdadero o falso', 400);
    }
    if (typeof data.stock_actual === 'number' && typeof data.capacidad_maxima === 'number' && data.stock_actual > data.capacidad_maxima) {
        throw new AppError('Stock actual no puede superar la capacidad maxima', 400);
    }
};
