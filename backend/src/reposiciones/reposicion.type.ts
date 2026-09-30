export type CreateReposicionDetalleDTO = {
  id_maquina_producto: number;
  stock_sistema: number;
  stock_encontrado: number;
  cantidad_vendida: number;
  cantidad_repuesta: number;
  cantidad_retirada: number;
  stock_final: number;
  precio_venta_actual: number;
  venta_esperada: number;
};

export type CreateReposicionDTO = {
  id_maquina: number;
  id_repartidor: number;
  dinero_retirado: number;
  observacion?: string;
  venta_esperada: number;
  diferencia_dinero: number;
  detalles: CreateReposicionDetalleDTO[];
};
