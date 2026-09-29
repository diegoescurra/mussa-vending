import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/AsyncHandler.js';
import {
    createUsuario,
    deleteUsuario,
    getAllUsuarios,
    getUsuarioById,
    updateUsuario,
} from './usuario.service.js';
import type { CreateUsuarioDTO, RolUsuario, UpdateUsuarioDTO } from './usuario.type.js';

const rolesValidos: RolUsuario[] = ['ADMIN', 'REPONEDOR'];

const isValidRol = (rol: string): rol is RolUsuario => rolesValidos.includes(rol as RolUsuario);

export const getUsuariosController = asyncHandler(async (_req, res) => {
    const usuarios = await getAllUsuarios();

    res.json({
        status: 'success',
        data: usuarios,
    });
})

export const getUsuarioByIdController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const usuario = await getUsuarioById(id);

    if (!usuario) {
        throw new AppError('Usuario no encontrado', 404);
    }

    res.json({
        status: 'success',
        data: usuario,
    });
})

export const createUsuarioController = asyncHandler(async (req, res) => {
    const { nombre, apellido, email, password_hash = 'pendiente', rol } = req.body;

    if (!nombre || !apellido || !email || !password_hash || !rol) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

    if (!isValidRol(rol)) {
        throw new AppError('Rol invalido', 400);
    }

    const newUsuario = await createUsuario({
        nombre,
        apellido,
        email,
        password_hash,
        rol,
    } as CreateUsuarioDTO);

    res.status(201).json({
        status: 'success',
        data: newUsuario,
    });
})

export const updateUsuarioController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { nombre, apellido, email, password_hash, rol, estado } = req.body;

    if (
        nombre === undefined &&
        apellido === undefined &&
        email === undefined &&
        password_hash === undefined &&
        rol === undefined &&
        estado === undefined
    ) {
        throw new AppError('Debe enviar al menos un campo para actualizar', 400);
    }

    if (rol !== undefined && !isValidRol(rol)) {
        throw new AppError('Rol invalido', 400);
    }

    const updatedUsuario = await updateUsuario({
        nombre,
        apellido,
        email,
        password_hash,
        rol,
        estado,
    } as UpdateUsuarioDTO, id);

    res.json({
        status: 'success',
        data: updatedUsuario,
    });
})

export const deleteUsuarioController = asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const usuario = await getUsuarioById(id);

    if (!usuario) {
        throw new AppError('Usuario no encontrado', 404);
    }

    await deleteUsuario(id);

    res.status(204).json({
        status: 'success',
        data: null,
    });
})
