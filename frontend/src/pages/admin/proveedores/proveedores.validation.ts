export type ProveedorForm = { nombre: string; estado: string };

export const validateProveedorForm = (form: ProveedorForm, updating = false) => {
  const errors: Partial<Record<keyof ProveedorForm, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'Escribe el nombre del proveedor.';
  if (updating && form.estado !== 'true' && form.estado !== 'false') {
    errors.estado = 'Selecciona un estado valido.';
  }
  return errors;
};

export const proveedorFormToCreatePayload = (form: ProveedorForm) => ({ nombre: form.nombre.trim() });
export const proveedorFormToUpdatePayload = (form: ProveedorForm) => ({
  ...proveedorFormToCreatePayload(form),
  estado: form.estado === 'true',
});
