import type { FormEvent } from 'react';
import { FormActions } from '../../../components/forms/FormActions';
import { NumberField } from '../../../components/forms/NumberField';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { Modal } from '../../../components/Modal';
import type { Proveedor } from '../../../services/proveedores.service';
import type { Producto } from '../../../services/productos.service';
import type { ProductoForm } from './productos.mapper';

type ProductoFormModalProps = {
  form: ProductoForm;
  proveedores: Proveedor[];
  editingProducto: Producto | null;
  isSaving: boolean;
  saveError: Error | null;
  onChange: (form: ProductoForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const ProductoFormModal = ({
  form,
  proveedores,
  editingProducto,
  isSaving,
  saveError,
  onChange,
  onSubmit,
  onClose,
}: ProductoFormModalProps) => {
  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Modal
      title={editingProducto ? 'Editar producto' : 'Nuevo producto'}
      description="Completa los datos principales del producto."
      onClose={handleClose}
      closeDisabled={isSaving}
    >
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSaving} className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre"
            required
            value={form.nombre}
            onChange={(nombre) => onChange({ ...form, nombre })}
            className="sm:col-span-2"
          />
          <NumberField
            label="Precio venta"
            required
            value={form.precio_venta}
            onChange={(precio_venta) => onChange({ ...form, precio_venta })}
          />
          <NumberField
            label="Costo compra"
            required
            value={form.costo_compra}
            onChange={(costo_compra) => onChange({ ...form, costo_compra })}
          />
          <SelectField
            label="Proveedor"
            required
            value={form.id_proveedor}
            placeholder="Selecciona un proveedor"
            options={proveedores
              .filter(
                (proveedor) => proveedor.estado || proveedor.id_proveedor === editingProducto?.id_proveedor,
              )
              .map((proveedor) => ({
                value: proveedor.id_proveedor,
                label: `${proveedor.nombre}${proveedor.estado ? '' : ' (inactivo)'}`,
              }))}
            onChange={(id_proveedor) => onChange({ ...form, id_proveedor })}
            className="sm:col-span-2"
          />
          {saveError ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {saveError.message}
            </p>
          ) : null}
          <FormActions
            submitLabel={editingProducto ? 'Guardar cambios' : 'Crear producto'}
            isSubmitting={isSaving}
            onCancel={handleClose}
          />
        </fieldset>
      </form>
    </Modal>
  );
};
