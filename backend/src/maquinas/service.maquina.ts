import * as repository from './maquina.repository.js';
import { AppError } from '../utils/AppError.js';
import type { UpdateMaquinaDTO } from './maquina.dto.js';

export const getAllMaquinas = repository.findAll;

export const getMaquinaById = repository.findById;

export const createMaquina = repository.insert;

export const updateMaquina = async (maquina: UpdateMaquinaDTO, id: number) => {
    const updated = await repository.update(maquina, id);
    if (!updated) throw new AppError('Maquina no encontrada', 404);
    return updated;
}

export const deleteMaquina = async (id: number) => {
    if (!await repository.remove(id)) throw new AppError('Maquina no encontrada', 404);
};
