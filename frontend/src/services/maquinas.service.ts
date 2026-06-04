import { api } from './api';

export type EstadoMaquina = 'ACTIVA' | 'INACTIVA' | 'MANTENCION';

export type Maquina = {
  id_maquina: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  estado: EstadoMaquina;
  fecha_creacion: string;
};

export type CreateMaquinaDTO = {
  codigo: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  estado: EstadoMaquina;
};

export type UpdateMaquinaDTO = CreateMaquinaDTO;

export const maquinasService = {
  getAll: () => api.get<Maquina[]>('/maquinas'),
  getById: (id: number) => api.get<Maquina>(`/maquinas/${id}`),
  create: (maquina: CreateMaquinaDTO) => api.post<Maquina>('/maquinas', maquina),
  update: (id: number, maquina: UpdateMaquinaDTO) => api.put<Maquina>(`/maquinas/${id}`, maquina),
  delete: (id: number) => api.delete<void>(`/maquinas/${id}`),
};
