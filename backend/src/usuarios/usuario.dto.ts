import type { RolUsuario } from './usuario.type.js';

export type CreateUsuarioDTO = {
    nombre: string;
    apellido: string;
    email: string;
    password_hash: string;
    rol: RolUsuario;
}

export type UpdateUsuarioDTO = {
    nombre?: string;
    apellido?: string;
    email?: string;
    password_hash?: string;
    rol?: RolUsuario;
    estado?: boolean;
}
