export type Producto = {
  id_producto: number;
  nombre: string;
  precio_venta: number;
  costo_compra: number;
  estado: boolean;
  fecha_creacion: Date;
  id_proveedor: number | null;
}

export type ProductoConProveedor = Producto & {
  proveedor_nombre: string | null;
};

export type CreateProductoDTO = {
  nombre: string;
  precio_venta: number;
  costo_compra?: number;
  id_proveedor?: number;
};

export type UpdateProductoDTO = {
    
  nombre?: string;
  precio_venta?: number;
  costo_compra?: number;
  id_proveedor?: number | null;
  estado?: boolean;
}