import type { CreateMaquinaProductoDTO, MaquinaProductoDetalle, UpdateMaquinaProductoDTO } from '../../../services/maquina-productos.service';

export type InventarioForm = {
  id_maquina: string;
  id_producto: string;
  capacidad_maxima: string;
  stock_actual: string;
  precio_venta_actual: string;
  estado: string;
};

export const emptyInventarioForm: InventarioForm = {
  id_maquina: '',
  id_producto: '',
  capacidad_maxima: '',
  stock_actual: '',
  precio_venta_actual: '',
  estado: 'true',
};

export const inventarioToForm = (item: MaquinaProductoDetalle): InventarioForm => ({
  id_maquina: String(item.id_maquina),
  id_producto: String(item.id_producto),
  capacidad_maxima: String(item.capacidad_maxima),
  stock_actual: String(item.stock_actual),
  precio_venta_actual: String(item.precio_venta_actual),
  estado: String(item.estado),
});

export const inventarioFormToCreatePayload = (form: InventarioForm): CreateMaquinaProductoDTO => ({
  id_maquina: Number(form.id_maquina),
  id_producto: Number(form.id_producto),
  capacidad_maxima: Number(form.capacidad_maxima),
  stock_actual: Number(form.stock_actual),
  precio_venta_actual: Number(form.precio_venta_actual),
});

export const inventarioFormToUpdatePayload = (form: InventarioForm): UpdateMaquinaProductoDTO => ({
  capacidad_maxima: Number(form.capacidad_maxima),
  stock_actual: Number(form.stock_actual),
  precio_venta_actual: Number(form.precio_venta_actual),
  estado: form.estado === 'true',
});
