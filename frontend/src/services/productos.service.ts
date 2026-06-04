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

export type ProductoConProveedor = Producto & {
  proveedor_nombre: string | null;
};

export type CreateProductoDTO = {
  nombre: string;
  precio_venta: number;
  costo_compra: number;
  id_proveedor: number;
};

export type UpdateProductoDTO = CreateProductoDTO;

export const productosService = {
  getAll: () => api.get<Producto[]>('/productos'),
  getById: (id: number) => api.get<Producto>(`/productos/${id}`),
  create: (producto: CreateProductoDTO) => api.post<Producto>('/productos', producto),
  update: (id: number, producto: UpdateProductoDTO) => api.put<Producto>(`/productos/${id}`, producto),
  delete: (id: number) => api.delete<void>(`/productos/${id}`),
};
