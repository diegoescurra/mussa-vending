import * as repository from './usuario.repository.js';
import { AppError } from '../utils/AppError.js';
import type { CreateUsuarioDTO, UpdateUsuarioDTO } from './usuario.dto.js';
import { hashPassword } from '../auth/password.js';

export const getAllUsuarios = repository.findAll;
export const getActiveReponedores = repository.findActiveReponedores;

export const getUsuarioById = repository.findById;

export const createUsuario = async (usuario: CreateUsuarioDTO) => {
    try {
      const { password, ...fields } = usuario;
      return await repository.insert({ ...fields, password_hash: await hashPassword(password) });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new AppError('Ya existe un usuario con ese email', 409);
      throw error;
    }

}

export const updateUsuario = async (usuario: UpdateUsuarioDTO, id: number) => {
    try {
      const { password, ...fields } = usuario;
      const updated = await repository.update({ ...fields, password_hash: password === undefined ? undefined : await hashPassword(password) }, id);
      if (!updated) throw new AppError('Usuario no encontrado', 404);
      return updated;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new AppError('Ya existe un usuario con ese email', 409);
      throw error;
    }

}

export const deleteUsuario = async (id: number) => {
    try {
      if (!await repository.remove(id)) throw new AppError('Usuario no encontrado', 404);
    } catch (error) {
      if ((error as { code?: string }).code === '23503') {
        throw new AppError('El usuario tiene una camioneta o historial asociado; desactivelo en lugar de eliminarlo', 409);
      }
      throw error;
    }
}
