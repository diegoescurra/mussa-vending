import { AppError } from '../utils/AppError.js';
import type { CreateMaquinaDTO } from './maquina.dto.js';

const validateConfiguracion = (modelo: unknown, sistemas_pago: unknown) => {
    if (typeof modelo !== 'string' || !modelo.trim()) {
        throw new AppError('El modelo es obligatorio y debe ser un texto no vacio', 400);
    }
    if (!Array.isArray(sistemas_pago) || sistemas_pago.length === 0 ||
        !sistemas_pago.every(value => ['MONEDA', 'BILLETE', 'TARJETA'].includes(value)) ||
        new Set(sistemas_pago).size !== sistemas_pago.length) {
        throw new AppError('Los sistemas de pago deben ser MONEDA, BILLETE o TARJETA, sin duplicados y al menos uno', 400);
    }
};

export const validateMaquinaBody = (body: unknown): CreateMaquinaDTO => {
    const { codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago } = body as CreateMaquinaDTO;
    if (!codigo || !nombre || !descripcion || !ubicacion || !estado) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }
    validateConfiguracion(modelo, sistemas_pago);
    return { codigo, nombre, descripcion, ubicacion, estado, modelo: modelo.trim(), sistemas_pago };
};
