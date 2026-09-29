import { api } from './api';

export type Usuario = {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  estado: boolean;
  fecha_creacion: string;
};

export type CreateUsuarioDTO = {
  nombre: string;
  email: string;
  rol: string;
};

export type UpdateUsuarioDTO = {
  nombre?: string;
  email?: string;
  rol?: string;
  estado?: boolean;
};

export const usuariosService = {
  getAll: () => api.get<Usuario[]>('/usuarios'),
  getById: (id: number) => api.get<Usuario>(`/usuarios/${id}`),
  create: (usuario: CreateUsuarioDTO) => api.post<Usuario>('/usuarios', usuario),
  update: (id: number, usuario: UpdateUsuarioDTO) => api.put<Usuario>(`/usuarios/${id}`, usuario),
  delete: (id: number) => api.delete<void>(`/usuarios/${id}`),
};
