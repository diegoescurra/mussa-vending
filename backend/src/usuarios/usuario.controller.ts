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

const isValidRol = (rol: unknown): rol is RolUsuario => typeof rol === 'string' && rolesValidos.includes(rol as RolUsuario);

const parseId = (value: unknown) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) throw new AppError('ID de usuario invalido', 400);
    return id;
};

const validatePersonalFields = (fields: { nombre?: unknown; apellido?: unknown; email?: unknown }) => {
    for (const [field, value] of Object.entries(fields)) {
        if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
            throw new AppError(`El campo ${field} debe ser texto no vacio`, 400);
        }
    }
    if (typeof fields.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
        throw new AppError('Email invalido', 400);
    }
};

export const getUsuariosController = asyncHandler(async (_req, res) => {
    const usuarios = await getAllUsuarios();

    res.json({
        status: 'success',
        data: usuarios,
    });
})

export const getUsuarioByIdController = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
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
    const { nombre, apellido, email, password_hash = 'pendiente', rol } = req.body ?? {};

    if (!nombre || !apellido || !email || !password_hash || !rol) {
        throw new AppError('Todos los campos son obligatorios', 400);
    }

    if (!isValidRol(rol)) {
        throw new AppError('Rol invalido', 400);
    }
    validatePersonalFields({ nombre, apellido, email });

    const newUsuario = await createUsuario({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        password_hash,
        rol,
    } as CreateUsuarioDTO);

    res.status(201).json({
        status: 'success',
        data: newUsuario,
    });
})

export const updateUsuarioController = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { nombre, apellido, email, password_hash, rol, estado } = req.body ?? {};

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
    validatePersonalFields({ nombre, apellido, email });
    if (estado !== undefined && typeof estado !== 'boolean') throw new AppError('Estado invalido', 400);

    const updatedUsuario = await updateUsuario({
        nombre: nombre?.trim(),
        apellido: apellido?.trim(),
        email: email?.trim(),
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
    const id = parseId(req.params.id);
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
