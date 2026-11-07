export interface MaquinaProducto {
  id_maquina_producto: number;
  id_maquina: number;
  id_producto: number;
  capacidad_maxima: number;
  stock_actual: number;
  precio_venta_actual: string;
  version: number;
  estado: boolean;
}

export interface MaquinaProductoDetalle extends MaquinaProducto {
  maquina_codigo: string;
  maquina_nombre: string | null;
  maquina_ubicacion: string;
  producto_nombre: string;
  proveedor_nombre: string | null;
}
