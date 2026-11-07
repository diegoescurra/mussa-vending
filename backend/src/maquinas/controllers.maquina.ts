import { AppError } from '../utils/AppError.js';
import type { RequestHandler } from 'express';
import { parsePositiveInt32 } from '../utils/int32.js';
import { createMaquina, deleteMaquina, getAllMaquinas, getMaquinaById, updateMaquina } from './service.maquina.js'
import { validateMaquinaBody } from './maquina.validation.js';

export const getMaquinasController: RequestHandler = async (_req, res) => {
    const maquinas = await getAllMaquinas();
    res.json({
        status: 'success',
        data: maquinas
    });
};

export const getMaquinaByIdController: RequestHandler = async (req, res) => {
    const id = parsePositiveInt32(req.params.id, 'ID de maquina invalido');
    const maquina = await getMaquinaById(id);
    if (!maquina) {
        throw new AppError('Maquina no encontrada', 404);
    }
    res.json({
        status: 'success',
        data: maquina
    });
};

export const createMaquinaController: RequestHandler = async (req, res) => {
    const newMaquina = await createMaquina(validateMaquinaBody(req.body));
    res.status(201).json({
        status: 'success',
        data: newMaquina
    });
};

export const updateMaquinaController: RequestHandler = async (req, res) => {
    const id = parsePositiveInt32(req.params.id, 'ID de maquina invalido');
    const updatedMaquina = await updateMaquina(validateMaquinaBody(req.body), id);
    res.json({
        status: 'success',
        data: updatedMaquina
    });
};

export const deleteMaquinaController: RequestHandler = async (req, res) => {
    const id = parsePositiveInt32(req.params.id, 'ID de maquina invalido');
    await deleteMaquina(id);
    res.status(204).json({
        status: 'success',
        data: null
    });
};
