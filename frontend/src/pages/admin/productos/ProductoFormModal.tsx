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
  onChange: (form: ProductoForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const ProductoFormModal = ({
  form,
  proveedores,
  editingProducto,
  isSaving,
  onChange,
  onSubmit,
  onClose,
}: ProductoFormModalProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Modal title={editingProducto ? 'Editar producto' : 'Nuevo producto'} description="Completa los datos principales del producto." onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nombre" required value={form.nombre} onChange={(nombre) => onChange({ ...form, nombre })} className="sm:col-span-2" />
        <NumberField label="Precio venta" required value={form.precio_venta} onChange={(precio_venta) => onChange({ ...form, precio_venta })} />
        <NumberField label="Costo compra" required value={form.costo_compra} onChange={(costo_compra) => onChange({ ...form, costo_compra })} />
        <SelectField
          label="Proveedor"
          required
          value={form.id_proveedor}
          placeholder="Selecciona un proveedor"
          options={proveedores
            .filter((proveedor) => proveedor.estado || proveedor.id_proveedor === editingProducto?.id_proveedor)
            .map((proveedor) => ({ value: proveedor.id_proveedor, label: `${proveedor.nombre}${proveedor.estado ? '' : ' (inactivo)'}` }))}
          onChange={(id_proveedor) => onChange({ ...form, id_proveedor })}
          className="sm:col-span-2"
        />
        <FormActions submitLabel={editingProducto ? 'Guardar cambios' : 'Crear producto'} isSubmitting={isSaving} onCancel={onClose} />
      </form>
    </Modal>
  );
};
