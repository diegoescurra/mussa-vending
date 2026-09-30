import { api } from './api';

export type Conteo = {
  id_conteo: number;
  id_camioneta: number | null;
  id_producto: number;
  id_responsable: number;
  stock_esperado: number;
  stock_fisico: number;
  diferencia: number;
  observacion: string | null;
  fecha_creacion: string;
};

export type ConteoDetalle = Conteo & {
  producto_nombre: string;
  responsable_nombre: string;
};

export type CreateConteoPayload = {
  id_responsable: number;
  id_producto: number;
  stock_fisico: number;
  id_camioneta?: number;
  observacion?: string;
};

export const conteosService = {
  getAll: (idCamioneta?: number) => api.get<ConteoDetalle[]>(idCamioneta === undefined ? '/conteos' : `/conteos?id_camioneta=${idCamioneta}`),
  create: (payload: CreateConteoPayload) => api.post<Conteo>('/conteos', payload),
};
