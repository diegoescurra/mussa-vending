import type { InventarioForm } from './inventario.mapper';

export type InventarioErrors = Partial<Record<keyof InventarioForm, string>>;

export const validateInventarioForm = (form: InventarioForm): InventarioErrors => {
  const errors: InventarioErrors = {};
  for (const field of ['id_maquina', 'id_producto'] as const) {
    const value = Number(form[field]);
    if (!form[field].trim() || !Number.isInteger(value) || value <= 0 || value > 2147483647) {
      errors[field] = field === 'id_maquina' ? 'Selecciona una maquina valida.' : 'Selecciona un producto.';
    }
  }
  for (const [field, label] of [['capacidad_maxima', 'La capacidad maxima'], ['stock_actual', 'El stock actual']] as const) {
    const value = Number(form[field]);
    if (!form[field].trim()) {
      errors[field] = `${label} es obligatorio.`;
    } else if (!Number.isInteger(value) || value < 0 || value > 2147483647) {
      errors[field] = `${label} debe ser un entero entre 0 y 2147483647.`;
    }
  }
  if (!errors.stock_actual && !errors.capacidad_maxima && Number(form.stock_actual) > Number(form.capacidad_maxima)) {
    errors.stock_actual = `El stock actual no puede superar la capacidad maxima de ${Number(form.capacidad_maxima)} unidades.`;
  }
  const price = Number(form.precio_venta_actual);
  if (!form.precio_venta_actual.trim()) {
    errors.precio_venta_actual = 'Ingresa el precio actual.';
  } else if (!Number.isFinite(price) || price < 0 || price > 9999999999.99 || price !== Number(price.toFixed(2))) {
    errors.precio_venta_actual = 'El precio debe estar entre 0 y 9999999999.99 y tener hasta 2 decimales.';
  }
  if (form.estado !== 'true' && form.estado !== 'false') {
    errors.estado = 'Selecciona un estado valido.';
  }
  return errors;
};
