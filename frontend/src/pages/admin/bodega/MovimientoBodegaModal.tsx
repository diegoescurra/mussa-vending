import type { FormEvent } from 'react';
import type { BodegaProducto, CreateBodegaMovimientoPayload } from '../../../services/bodega.service';
import { Modal } from '../../../components/Modal';
import { NumberField } from '../../../components/forms/NumberField';
import { TextField } from '../../../components/forms/TextField';
import { SelectField } from '../../../components/forms/SelectField';
import { FormActions } from '../../../components/forms/FormActions';
import type { MovimientoBodegaForm } from './useBodega';

type Props = {
  inventario: BodegaProducto[];
  selectedProduct?: BodegaProducto;
  form: MovimientoBodegaForm;
  isSaving: boolean;
  error?: string;
  onChange: (form: MovimientoBodegaForm) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export const MovimientoBodegaModal = ({
  inventario,
  selectedProduct,
  form,
  isSaving,
  error,
  onChange,
  onSubmit,
  onClose,
}: Props) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Modal
      title="Registrar movimiento"
      description="Las entradas suman stock y las salidas lo descuentan."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSaving} className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Producto"
            required
            value={form.id_producto}
            placeholder="Selecciona un producto"
            options={inventario.map((producto) => ({
              value: producto.id_producto,
              label: producto.producto_nombre,
            }))}
            onChange={(id_producto) => onChange({ ...form, id_producto })}
            className="sm:col-span-2"
          />
          <SelectField
            label="Tipo"
            value={form.tipo}
            options={[
              { value: 'ENTRADA', label: 'Entrada' },
              { value: 'SALIDA', label: 'Salida' },
            ]}
            onChange={(tipo) => onChange({ ...form, tipo: tipo as CreateBodegaMovimientoPayload['tipo'] })}
          />
          <NumberField
            label="Cantidad"
            required
            value={form.cantidad}
            onChange={(cantidad) => onChange({ ...form, cantidad })}
          />
          {selectedProduct ? (
            <p className="text-sm text-slate-600 sm:col-span-2">
              Stock disponible: {selectedProduct.stock_actual} unidades.
            </p>
          ) : null}
          <TextField
            label="Observacion (opcional)"
            value={form.observacion}
            onChange={(observacion) => onChange({ ...form, observacion })}
            rows={2}
            className="sm:col-span-2"
          />
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          ) : null}
          <FormActions
            submitLabel={isSaving ? 'Guardando...' : 'Guardar movimiento'}
            isSubmitting={isSaving}
            onCancel={onClose}
          />
        </fieldset>
      </form>
    </Modal>
  );
};
