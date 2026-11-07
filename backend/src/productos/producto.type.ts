export type Producto = {
  id_producto: number;
  nombre: string;
  precio_venta: string;
  costo_compra: string;
  estado: boolean;
  fecha_creacion: Date;
  id_proveedor: number | null;
}
