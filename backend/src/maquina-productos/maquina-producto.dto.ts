export interface CreateMaquinaProductoDTO {
  id_maquina: number;
  id_producto: number;
  capacidad_maxima: number;
  stock_actual: number;
  precio_venta_actual: number;
}

export interface UpdateMaquinaProductoDTO {
  version: number;
  capacidad_maxima?: number;
  stock_actual?: number;
  precio_venta_actual?: number;
  estado?: boolean;
}
