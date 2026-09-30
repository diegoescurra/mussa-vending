import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useState, type FormEvent } from 'react';
import { FormActions } from '../../../components/forms/FormActions';
import { NumberField } from '../../../components/forms/NumberField';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { Modal } from '../../../components/Modal';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { bodegaService, type BodegaProducto, type BodegaMovimientoDetalle, type CreateBodegaMovimientoPayload } from '../../../services/bodega.service';
import { EntregaCamionetaModal } from './EntregaCamionetaModal';
import { ConteoInventarioModal } from '../../../components/ConteoInventarioModal';
import { ConteosInventario } from '../../../components/ConteosInventario';

const inventarioColumns: ColumnDef<BodegaProducto>[] = [
  { accessorKey: 'producto_nombre', header: 'Producto' },
  { accessorKey: 'stock_actual', header: 'Unidades en bodega' },
  { accessorKey: 'estado', header: 'Estado', cell: ({ row }) => <StatusBadge active={row.original.estado} /> },
];

const dateFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' });

const movimientoColumns: ColumnDef<BodegaMovimientoDetalle>[] = [
  { accessorKey: 'fecha_creacion', header: 'Fecha', cell: ({ row }) => dateFormatter.format(new Date(row.original.fecha_creacion)) },
  { accessorKey: 'producto_nombre', header: 'Producto' },
  {
    accessorKey: 'tipo',
    header: 'Movimiento',
    cell: ({ row }) => <StatusBadge active={row.original.tipo === 'ENTRADA'} activeLabel="Entrada" inactiveLabel="Salida" />,
  },
  { accessorKey: 'cantidad', header: 'Cantidad' },
  { accessorKey: 'stock_final', header: 'Saldo final' },
  { accessorKey: 'observacion', header: 'Observacion', cell: ({ row }) => row.original.observacion || '-' },
];

const emptyForm = { id_producto: '', tipo: 'ENTRADA' as CreateBodegaMovimientoPayload['tipo'], cantidad: '', observacion: '' };

export const BodegaPage = () => {
  const queryClient = useQueryClient();
  const inventario = useQuery({ queryKey: ['bodega'], queryFn: bodegaService.getInventario });
  const movimientos = useQuery({ queryKey: ['bodega-movimientos'], queryFn: bodegaService.getMovimientos });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEntregaOpen, setIsEntregaOpen] = useState(false);
  const [isConteoOpen, setIsConteoOpen] = useState(false);
  const [entregaSuccess, setEntregaSuccess] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const saveMutation = useMutation({
    mutationFn: bodegaService.createMovimiento,
    onSuccess: async () => {
      setIsModalOpen(false);
      setForm(emptyForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bodega'] }),
        queryClient.invalidateQueries({ queryKey: ['bodega-movimientos'] }),
      ]);
    },
  });

  const openModal = () => {
    saveMutation.reset();
    setFormError('');
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!saveMutation.isPending) setIsModalOpen(false);
  };

  const selectedProduct = inventario.data?.find((producto) => producto.id_producto === Number(form.id_producto));

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saveMutation.isPending) return;
    setFormError('');
    const cantidad = Number(form.cantidad);
    if (!selectedProduct || !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647) {
      setFormError('Selecciona un producto e ingresa una cantidad entera mayor que cero.');
      return;
    }
    if (form.tipo === 'SALIDA' && cantidad > selectedProduct.stock_actual) {
      setFormError(`Stock insuficiente. Hay ${selectedProduct.stock_actual} unidades disponibles.`);
      return;
    }
    saveMutation.mutate({
      id_producto: selectedProduct.id_producto,
      tipo: form.tipo,
      cantidad,
      observacion: form.observacion.trim() || undefined,
    });
  };

  return (
    <section>
      <PageHeader
        title="Bodega"
        description="Consulta los saldos y registra entradas o salidas de productos."
        actions={(
          <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setIsConteoOpen(true)} disabled={!inventario.data?.length || inventario.isError || inventario.isFetching} className="rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60">
            Registrar conteo fisico
          </button>
          <button type="button" onClick={() => { setEntregaSuccess(false); setIsEntregaOpen(true); }} disabled={!inventario.data?.length || inventario.isError || inventario.isFetching || saveMutation.isPending} className="rounded-2xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60">
            Entregar a camioneta
          </button>
          <button type="button" onClick={openModal} disabled={!inventario.data?.length || inventario.isError || saveMutation.isPending} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
            Registrar movimiento
          </button>
          </div>
        )}
      />
      {saveMutation.isSuccess ? <p role="status" className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">Movimiento registrado correctamente.</p> : null}
      {entregaSuccess ? <p role="status" className="mb-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">Entrega a camioneta registrada correctamente.</p> : null}
      {inventario.isLoading ? (
        <StateMessage title="Cargando bodega" description="Obteniendo saldos de productos." />
      ) : inventario.isError ? (
        <StateMessage title="No se pudo cargar la bodega" description={inventario.error.message} />
      ) : (
        <DataTable columns={inventarioColumns} data={inventario.data ?? []} searchPlaceholder="Buscar producto en bodega..." emptyMessage="No hay productos registrados. Crea productos en el catalogo primero." />
      )}
      <h3 className="mb-4 mt-8 text-xl font-bold text-slate-950">Historial de movimientos</h3>
      {movimientos.isLoading ? (
        <StateMessage title="Cargando movimientos" description="Obteniendo el historial de bodega." />
      ) : movimientos.isError ? (
        <StateMessage title="No se pudieron cargar los movimientos" description={movimientos.error.message} />
      ) : (
        <DataTable columns={movimientoColumns} data={movimientos.data ?? []} searchPlaceholder="Buscar movimiento..." emptyMessage="No hay movimientos registrados." />
      )}
      <ConteosInventario />
      {isConteoOpen ? <ConteoInventarioModal inventario={inventario.data} inventarioReady={inventario.isSuccess && !inventario.isFetching} onClose={() => setIsConteoOpen(false)} /> : null}
      {isEntregaOpen ? <EntregaCamionetaModal inventario={inventario.data} inventarioReady={inventario.isSuccess && !inventario.isFetching} onClose={() => setIsEntregaOpen(false)} onSuccess={() => { setIsEntregaOpen(false); setEntregaSuccess(true); }} /> : null}
      {isModalOpen ? (
        <Modal title="Registrar movimiento" description="Las entradas suman stock y las salidas lo descuentan." onClose={closeModal}>
          <form onSubmit={submitForm}>
            <fieldset disabled={saveMutation.isPending} className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Producto"
                required
                value={form.id_producto}
                placeholder="Selecciona un producto"
                options={(inventario.data ?? []).map((producto) => ({ value: producto.id_producto, label: producto.producto_nombre }))}
                onChange={(id_producto) => setForm({ ...form, id_producto })}
                className="sm:col-span-2"
              />
              <SelectField label="Tipo" value={form.tipo} options={[{ value: 'ENTRADA', label: 'Entrada' }, { value: 'SALIDA', label: 'Salida' }]} onChange={(tipo) => setForm({ ...form, tipo: tipo as CreateBodegaMovimientoPayload['tipo'] })} />
              <NumberField label="Cantidad" required value={form.cantidad} onChange={(cantidad) => setForm({ ...form, cantidad })} />
              {selectedProduct ? <p className="text-sm text-slate-600 sm:col-span-2">Stock disponible: {selectedProduct.stock_actual} unidades.</p> : null}
              <TextField label="Observacion (opcional)" value={form.observacion} onChange={(observacion) => setForm({ ...form, observacion })} rows={2} className="sm:col-span-2" />
              {formError || saveMutation.isError ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{formError || saveMutation.error?.message}</p> : null}
              <FormActions submitLabel={saveMutation.isPending ? 'Guardando...' : 'Guardar movimiento'} isSubmitting={saveMutation.isPending} onCancel={closeModal} />
            </fieldset>
          </form>
        </Modal>
      ) : null}
    </section>
  );
};
