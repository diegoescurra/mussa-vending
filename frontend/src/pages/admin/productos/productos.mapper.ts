import type { CreateProductoDTO, Producto } from '../../../services/productos.service';

export type ProductoForm = {
  nombre: string;
  precio_venta: string;
  costo_compra: string;
  id_proveedor: string;
};

export const emptyProductoForm: ProductoForm = {
  nombre: '',
  precio_venta: '',
  costo_compra: '',
  id_proveedor: '',
};

export const productoToForm = (producto: Producto): ProductoForm => ({
  nombre: producto.nombre,
  precio_venta: String(producto.precio_venta),
  costo_compra: String(producto.costo_compra),
  id_proveedor: producto.id_proveedor ? String(producto.id_proveedor) : '',
});

export const productoFormToPayload = (form: ProductoForm): CreateProductoDTO => ({
  nombre: form.nombre,
  precio_venta: Number(form.precio_venta),
  costo_compra: Number(form.costo_compra),
  id_proveedor: Number(form.id_proveedor),
});
