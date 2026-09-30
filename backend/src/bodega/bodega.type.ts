export type CreateBodegaMovimientoDTO = {
  id_producto: number;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  observacion?: string;
};
