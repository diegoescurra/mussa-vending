import type { FormEvent } from 'react';
import { FormActions } from '../../../components/forms/FormActions';
import { NumberField } from '../../../components/forms/NumberField';
import { SelectField } from '../../../components/forms/SelectField';
import { Modal } from '../../../components/Modal';
import type { MaquinaProductoDetalle } from '../../../services/maquina-productos.service';
import type { Maquina } from '../../../services/maquinas.service';
import type { Producto } from '../../../services/productos.service';
import type { InventarioForm } from './inventario.mapper';

type InventarioFormModalProps = {
  form: InventarioForm;
  activeMachine?: Maquina;
  productos: Producto[];
  availableProducts: Producto[];
  editingItem: MaquinaProductoDetalle | null;
  isLoadingProductos: boolean;
  isSaving: boolean;
  onChange: (form: InventarioForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const InventarioFormModal = ({
  form,
  activeMachine,
  productos,
  availableProducts,
  editingItem,
  isLoadingProductos,
  isSaving,
  onChange,
  onSubmit,
  onClose,
}: InventarioFormModalProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const productOptions = (editingItem ? productos : availableProducts).map((producto) => ({ value: producto.id_producto, label: producto.nombre }));
  const noProductsAvailable = !editingItem && !isLoadingProductos && availableProducts.length === 0;

  return (
    <Modal
      title={editingItem ? 'Editar producto de la máquina' : 'Añadir producto a la máquina'}
      description={activeMachine ? `Máquina: ${activeMachine.codigo} - ${activeMachine.nombre}` : 'Selecciona una máquina antes de agregar productos.'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Producto"
          required
          disabled={Boolean(editingItem)}
          value={form.id_producto}
          placeholder="Selecciona un producto"
          options={productOptions}
          hint={noProductsAvailable ? 'Todos los productos ya están asignados a esta máquina.' : undefined}
          onChange={(id_producto) => onChange({ ...form, id_producto })}
        />
        <NumberField label="Capacidad máxima" required value={form.capacidad_maxima} onChange={(capacidad_maxima) => onChange({ ...form, capacidad_maxima })} />
        <NumberField label="Stock actual" required value={form.stock_actual} onChange={(stock_actual) => onChange({ ...form, stock_actual })} />
        <NumberField label="Precio actual" required value={form.precio_venta_actual} onChange={(precio_venta_actual) => onChange({ ...form, precio_venta_actual })} />
        <SelectField
          label="Estado"
          value={form.estado}
          options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
          onChange={(estado) => onChange({ ...form, estado })}
        />
        <FormActions submitLabel={editingItem ? 'Guardar cambios' : 'Asignar producto'} isSubmitting={isSaving} onCancel={onClose} />
      </form>
    </Modal>
  );
};
