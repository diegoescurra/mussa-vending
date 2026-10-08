import { useState, type FormEvent } from 'react';
import { FormActions } from '../../../components/forms/FormActions';
import { NumberField } from '../../../components/forms/NumberField';
import { SelectField } from '../../../components/forms/SelectField';
import { Modal } from '../../../components/Modal';
import type { MaquinaProductoDetalle } from '../../../services/maquina-productos.service';
import type { Maquina } from '../../../services/maquinas.service';
import type { Producto } from '../../../services/productos.service';
import type { InventarioForm } from './inventario.mapper';
import { validateInventarioForm } from './inventario.validation';

type InventarioFormModalProps = {
  form: InventarioForm;
  activeMachine?: Maquina;
  productos: Producto[];
  availableProducts: Producto[];
  editingItem: MaquinaProductoDetalle | null;
  isLoadingProductos: boolean;
  isSaving: boolean;
  saveError?: string;
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
  saveError,
  onChange,
  onSubmit,
  onClose,
}: InventarioFormModalProps) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const productOptions = (editingItem ? productos : availableProducts).map((producto) => ({ value: producto.id_producto, label: producto.nombre }));
  const validateForm = () => {
    const errors = validateInventarioForm(form);
    if (!editingItem && !productOptions.some((option) => String(option.value) === form.id_producto)) {
      errors.id_producto = 'Selecciona un producto disponible.';
    }
    return errors;
  };
  const errors = hasSubmitted ? validateForm() : {};
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setHasSubmitted(true);
    if (Object.keys(validateForm()).length > 0) return;
    onSubmit();
  };

  const noProductsAvailable = !editingItem && !isLoadingProductos && availableProducts.length === 0;
  const capacity = Number(form.capacidad_maxima);
  const stockMax = form.capacidad_maxima.trim() && Number.isInteger(capacity) && capacity >= 0 ? capacity : undefined;

  return (
    <Modal
      title={editingItem ? 'Editar producto de la máquina' : 'Añadir producto a la máquina'}
      description={activeMachine ? `Máquina: ${activeMachine.codigo} - ${activeMachine.nombre}` : 'Selecciona una máquina antes de agregar productos.'}
      onClose={onClose}
      closeDisabled={isSaving}
    >
      <form noValidate onSubmit={handleSubmit}>
        {saveError || errors.id_maquina ? (
          <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{saveError || errors.id_maquina}</p>
        ) : null}
        <fieldset disabled={isSaving} className="grid min-w-0 gap-4 sm:grid-cols-2" aria-busy={isSaving}>
          <SelectField
            label="Producto"
            required
            error={errors.id_producto}
            disabled={Boolean(editingItem)}
            value={form.id_producto}
            placeholder="Selecciona un producto"
            options={productOptions}
            hint={noProductsAvailable ? 'Todos los productos ya están asignados a esta máquina.' : undefined}
            onChange={(id_producto) => onChange({ ...form, id_producto })}
          />
          <NumberField label="Capacidad máxima" required error={errors.capacidad_maxima} max={2147483647} step={1} value={form.capacidad_maxima} onChange={(capacidad_maxima) => onChange({ ...form, capacidad_maxima })} />
          <NumberField label="Stock actual" required error={errors.stock_actual} max={stockMax} step={1} value={form.stock_actual} onChange={(stock_actual) => onChange({ ...form, stock_actual })} />
          <NumberField label="Precio actual" required error={errors.precio_venta_actual} max={9999999999.99} step={0.01} value={form.precio_venta_actual} onChange={(precio_venta_actual) => onChange({ ...form, precio_venta_actual })} />
          {editingItem ? (
            <SelectField
              label="Estado"
              error={errors.estado}
              value={form.estado}
              options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
              onChange={(estado) => onChange({ ...form, estado })}
            />
          ) : null}
          <FormActions submitLabel={isSaving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Asignar producto'} isSubmitting={isSaving} onCancel={onClose} />
        </fieldset>
      </form>
    </Modal>
  );
};
