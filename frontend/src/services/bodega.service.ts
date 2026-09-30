import { api } from './api';

export type BodegaProducto = {
  id_producto: number;
  producto_nombre: string;
  estado: boolean;
  stock_actual: number;
};

export type CreateBodegaMovimientoPayload = {
  id_producto: number;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  observacion?: string;
};

export type BodegaMovimiento = Omit<CreateBodegaMovimientoPayload, 'observacion'> & {
  id_movimiento: number;
  stock_final: number;
  observacion?: string | null;
  fecha_creacion: string;
};

export type BodegaMovimientoDetalle = BodegaMovimiento & {
  producto_nombre: string;
};

export const bodegaService = {
  getInventario: () => api.get<BodegaProducto[]>('/bodega'),
  getMovimientos: () => api.get<BodegaMovimientoDetalle[]>('/bodega/movimientos'),
  createMovimiento: (payload: CreateBodegaMovimientoPayload) => api.post<BodegaMovimiento>('/bodega/movimientos', payload),
};
