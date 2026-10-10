import type { CreateMaquinaDTO } from '../../../services/maquinas.service';
import type { MaquinaForm } from './maquinas.mapper';

export type MaquinaFormErrors = Partial<Record<keyof MaquinaForm, string>>;

export const validateMaquinaForm = (form: MaquinaForm): MaquinaFormErrors => {
  const errors: MaquinaFormErrors = {};
  for (const field of ['codigo', 'nombre', 'modelo', 'ubicacion', 'descripcion'] as const) {
    if (!form[field].trim()) errors[field] = 'Este campo es obligatorio.';
  }
  if (!['ACTIVA', 'INACTIVA', 'MANTENCION'].includes(form.estado)) {
    errors.estado = 'Selecciona un estado valido.';
  }
  if (!Array.isArray(form.sistemas_pago) || form.sistemas_pago.length === 0) {
    errors.sistemas_pago = 'Selecciona al menos un sistema de pago.';
  } else if (form.sistemas_pago.some((value) => !['MONEDA', 'BILLETE', 'TARJETA'].includes(value))
    || new Set(form.sistemas_pago).size !== form.sistemas_pago.length) {
    errors.sistemas_pago = 'Selecciona sistemas de pago validos, sin duplicados.';
  }
  return errors;
};

export const toMaquinaPayload = (form: MaquinaForm): CreateMaquinaDTO => ({
  ...form,
  codigo: form.codigo.trim(),
  nombre: form.nombre.trim(),
  modelo: form.modelo.trim(),
  ubicacion: form.ubicacion.trim(),
  descripcion: form.descripcion.trim(),
  sistemas_pago: [...form.sistemas_pago],
});
