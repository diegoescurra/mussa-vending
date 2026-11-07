import { api, type HistoryPage } from './api';

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
  getPage: (idCamioneta: number | undefined, antesDe: number | null) => {
    const params = new URLSearchParams();
    if (idCamioneta !== undefined) params.set('id_camioneta', String(idCamioneta));
    if (antesDe !== null) params.set('antes_de', String(antesDe));
    return api.get<HistoryPage<ConteoDetalle>>(params.size ? `/conteos?${params}` : '/conteos');
  },
  create: (payload: CreateConteoPayload) => api.post<Conteo>('/conteos', payload),
};
