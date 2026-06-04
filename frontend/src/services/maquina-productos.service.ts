import { api } from './api';

export type MaquinaProducto = {
  id_maquina_producto: number;
  id_maquina: number;
  id_producto: number;
  capacidad_maxima: number;
  stock_actual: number;
  precio_venta_actual: number;
  estado: boolean;
};

export type CreateMaquinaProductoDTO = {
  id_maquina: number;
  id_producto: number;
  capacidad_maxima: number;
  stock_actual: number;
  precio_venta_actual: number;
};

export type UpdateMaquinaProductoDTO = {
  capacidad_maxima?: number;
  stock_actual?: number;
  precio_venta_actual?: number;
  estado?: boolean;
};

export type MaquinaProductoDetalle = MaquinaProducto & {
  maquina_codigo: string;
  maquina_nombre: string | null;
  maquina_ubicacion: string;
  producto_nombre: string;
  proveedor_nombre: string | null;
};

export const maquinaProductosService = {
  getAll: () => api.get<MaquinaProductoDetalle[]>('/maquina-productos'),
  getById: (id: number) => api.get<MaquinaProductoDetalle>(`/maquina-productos/${id}`),
  create: (maquinaProducto: CreateMaquinaProductoDTO) =>
    api.post<MaquinaProducto>('/maquina-productos', maquinaProducto),
  update: (id: number, maquinaProducto: UpdateMaquinaProductoDTO) =>
    api.put<MaquinaProducto>(`/maquina-productos/${id}`, maquinaProducto),
  delete: (id: number) => api.delete<void>(`/maquina-productos/${id}`),
};
