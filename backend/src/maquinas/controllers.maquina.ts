import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { createMaquina, deleteMaquina, getAllMaquinas, getMaquinaById, updateMaquina } from './service.maquina.js'
import type { CreateMaquinaDTO, UpdateMaquinaDTO } from './type.maquina.js';

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

export const getMaquinasController = asyncHandler(async (_req, res) => {
    const maquinas = await getAllMaquinas();
    res.json({
        status: 'success',
        data: maquinas
    });
})

export const getMaquinaByIdController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const maquina = await getMaquinaById(id);
    if (!maquina) {
        throw new AppError('Maquina no encontrada', 404);
    }
    res.json({
        status: 'success',
        data: maquina
    });
});

export const createMaquinaController = asyncHandler(async (req, res) => {
    const { codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago } = req.body;
    if (!codigo || !nombre || !descripcion || !ubicacion || !estado) { 
        throw new AppError('Todos los campos son obligatorios', 400);
    }
    validateConfiguracion(modelo, sistemas_pago);
    const newMaquina = await createMaquina({ codigo, nombre, descripcion, ubicacion, estado, modelo: modelo.trim(), sistemas_pago } as CreateMaquinaDTO);
    res.status(201).json({
        status: 'success',
        data: newMaquina
    });
})

export const updateMaquinaController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago } = req.body;
    if (!codigo || !nombre || !descripcion || !ubicacion || !estado) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }
    validateConfiguracion(modelo, sistemas_pago);
    const updatedMaquina = await updateMaquina({ codigo, nombre, descripcion, ubicacion, estado, modelo: modelo.trim(), sistemas_pago } as UpdateMaquinaDTO, id);
    res.json({
        status: 'success',
        data: updatedMaquina
    });
})

export const deleteMaquinaController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const maquina = await getMaquinaById(id); 
    if (!maquina) {
        throw new AppError('Maquina no encontrada', 404);
    }
    await deleteMaquina(id);
    res.status(204).json({
        status: 'success',
        data: null
    });
})
