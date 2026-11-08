import { api } from './api';

export type Usuario = {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  estado: boolean;
  fecha_creacion: string;
};

export type CreateUsuarioDTO = {
  password: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
};

export type UpdateUsuarioDTO = {
  password?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: string;
  estado?: boolean;
};

export const usuariosService = {
  getAll: () => api.get<Usuario[]>('/usuarios'),
  getReponedores: () => api.get<Pick<Usuario, 'id_usuario' | 'nombre' | 'apellido'>[]>('/usuarios/reponedores'),
  create: (usuario: CreateUsuarioDTO) => api.post<Usuario>('/usuarios', usuario),
  update: (id: number, usuario: UpdateUsuarioDTO) => api.put<Usuario>(`/usuarios/${id}`, usuario),
  delete: (id: number) => api.delete<void>(`/usuarios/${id}`),
};
