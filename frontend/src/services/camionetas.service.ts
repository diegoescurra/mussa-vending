import { api } from './api';

export type Camioneta = {
  id_camioneta: number;
  patente: string;
  nombre: string;
  id_repartidor: number;
  estado: boolean;
  fecha_creacion: string;
  repartidor_nombre: string;
  repartidor_apellido: string;
};

export type CamionetaPayload = {
  patente: string;
  nombre: string;
  id_repartidor: number;
  estado: boolean;
};

export type CamionetaProducto = {
  id_producto: number;
  producto_nombre: string;
  estado: boolean;
  stock_actual: number;
};

export type CreateCamionetaCargaPayload = {
  id_bodeguero: number;
  id_producto: number;
  cantidad: number;
  observacion?: string;
};

export type CamionetaMovimiento = {
  id_movimiento: number;
  id_camioneta: number;
  id_producto: number;
  id_bodeguero: number | null;
  id_repartidor: number;
  tipo: 'ENTRADA' | 'SALIDA';
  id_movimiento_bodega: number | null;
  id_reposicion: number | null;
  id_maquina: number | null;
  cantidad: number;
  stock_final: number;
  observacion: string | null;
  fecha_creacion: string;
};

export type CamionetaMovimientoDetalle = CamionetaMovimiento & {
  producto_nombre: string;
  bodeguero_nombre: string;
  repartidor_nombre: string;
};

export const camionetasService = {
  getAll: () => api.get<Camioneta[]>('/camionetas'),
  getById: (id: number) => api.get<Camioneta>(`/camionetas/${id}`),
  create: (payload: CamionetaPayload) => api.post<Omit<Camioneta, 'repartidor_nombre' | 'repartidor_apellido'>>('/camionetas', payload),
  update: (id: number, payload: CamionetaPayload) => api.put<Omit<Camioneta, 'repartidor_nombre' | 'repartidor_apellido'>>(`/camionetas/${id}`, payload),
  delete: (id: number) => api.delete<void>(`/camionetas/${id}`),
  getInventario: (id: number) => api.get<CamionetaProducto[]>(`/camionetas/${id}/inventario`),
  getMovimientos: (id: number) => api.get<CamionetaMovimientoDetalle[]>(`/camionetas/${id}/movimientos`),
  createCarga: (id: number, payload: CreateCamionetaCargaPayload) => api.post<CamionetaMovimiento>(`/camionetas/${id}/cargas`, payload),
};
