import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { createMaquina, deleteMaquina, getAllMaquinas, getMaquinaById, updateMaquina } from './service.maquina.js'
import type { CreateMaquinaDTO, UpdateMaquinaDTO } from './type.maquina.js';

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
    const { codigo, nombre, descripcion, ubicacion, estado } = req.body;
    if (!codigo || !nombre || !descripcion || !ubicacion || !estado) { 
        throw new AppError('Todos los campos son obligatorios', 400);
    }
    const newMaquina = await createMaquina({ codigo, nombre, descripcion, ubicacion, estado } as CreateMaquinaDTO);
    res.status(201).json({
        status: 'success',
        data: newMaquina
    });
})

export const updateMaquinaController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { codigo, nombre, descripcion, ubicacion, estado } = req.body;
    if (!codigo || !nombre || !descripcion || !ubicacion || !estado) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }
    const updatedMaquina = await updateMaquina({ codigo, nombre, descripcion, ubicacion, estado } as UpdateMaquinaDTO, id);
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
