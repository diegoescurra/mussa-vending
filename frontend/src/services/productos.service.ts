import { api } from './api';

export type Producto = {
  id_producto: number;
  nombre: string;
  precio_venta: number;
  costo_compra: number;
  estado: boolean;
  fecha_creacion: string;
  id_proveedor: number | null;
};

export type CreateProductoDTO = {
  nombre: string;
  precio_venta: number;
  costo_compra: number;
  id_proveedor: number;
};

export type UpdateProductoDTO = CreateProductoDTO;
export type ProductoOpcion = Pick<Producto, 'id_producto' | 'nombre'>;

export const productosService = {
  getAll: () => api.get<Producto[]>('/productos'),
  getOptions: () => api.get<ProductoOpcion[]>('/productos/opciones'),
  create: (producto: CreateProductoDTO) => api.post<Producto>('/productos', producto),
  update: (id: number, producto: UpdateProductoDTO) => api.put<Producto>(`/productos/${id}`, producto),
  delete: (id: number) => api.delete<void>(`/productos/${id}`),
};
