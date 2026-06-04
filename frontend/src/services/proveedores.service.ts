import { api } from './api';

export type Proveedor = {
  id_proveedor: number;
  nombre: string;
  estado: boolean;
  fecha_creacion: string;
};

export type CreateProveedorDTO = {
  nombre: string;
};

export type UpdateProveedorDTO = {
  nombre: string;
  estado: boolean;
};

export const proveedoresService = {
  getAll: () => api.get<Proveedor[]>('/proveedores'),
  getById: (id: number) => api.get<Proveedor>(`/proveedores/${id}`),
  create: (proveedor: CreateProveedorDTO) => api.post<Proveedor>('/proveedores', proveedor),
  update: (id: number, proveedor: UpdateProveedorDTO) => api.put<Proveedor>(`/proveedores/${id}`, proveedor),
  delete: (id: number) => api.delete<void>(`/proveedores/${id}`),
};
