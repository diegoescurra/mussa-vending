export type CreateConteoDTO = {
  id_responsable: number;
  id_producto: number;
  stock_fisico: number;
  id_camioneta?: number;
  observacion?: string;
};
