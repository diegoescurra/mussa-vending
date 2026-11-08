import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { HistoryLoadMore } from '../../../components/table/HistoryLoadMore';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { BodegaProducto, BodegaMovimientoDetalle } from '../../../services/bodega.service';
import { EntregaCamionetaModal } from './EntregaCamionetaModal';
import { ConteoInventarioModal } from '../../../components/ConteoInventarioModal';
import { ConteosInventario } from '../../../components/ConteosInventario';
import { MovimientoBodegaModal } from './MovimientoBodegaModal';
import { useBodega } from './useBodega';

const inventarioColumns: ColumnDef<BodegaProducto>[] = [
  { accessorKey: 'producto_nombre', header: 'Producto' },
  { accessorKey: 'stock_actual', header: 'Unidades en bodega' },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge active={row.original.estado} />,
  },
];

const dateFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' });

const movimientoColumns: ColumnDef<BodegaMovimientoDetalle>[] = [
  {
    accessorKey: 'fecha_creacion',
    header: 'Fecha',
    cell: ({ row }) => dateFormatter.format(new Date(row.original.fecha_creacion)),
  },
  { accessorKey: 'producto_nombre', header: 'Producto' },
  {
    accessorKey: 'tipo',
    header: 'Movimiento',
    cell: ({ row }) => (
      <StatusBadge active={row.original.tipo === 'ENTRADA'} activeLabel="Entrada" inactiveLabel="Salida" />
    ),
  },
  { accessorKey: 'cantidad', header: 'Cantidad' },
  { accessorKey: 'stock_final', header: 'Saldo final' },
  { accessorKey: 'observacion', header: 'Observacion', cell: ({ row }) => row.original.observacion || '-' },
];

export const BodegaPage = () => {
  const {
    inventario,
    movimientos,
    movimientoRows,
    isModalOpen,
    isEntregaOpen,
    setIsEntregaOpen,
    isConteoOpen,
    setIsConteoOpen,
    entregaSuccess,
    setEntregaSuccess,
    form,
    setForm,
    formError,
    saveMutation,
    openModal,
    closeModal,
    selectedProduct,
    submitForm,
  } = useBodega();

  return (
    <section>
      <PageHeader
        title="Bodega"
        description="Consulta los saldos y registra entradas o salidas de productos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setIsConteoOpen(true)}
              disabled={!inventario.data?.length || inventario.isError || inventario.isFetching}
              variant="outline"
            >
              Registrar conteo fisico
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEntregaSuccess(false);
                setIsEntregaOpen(true);
              }}
              disabled={
                !inventario.data?.length ||
                inventario.isError ||
                inventario.isFetching ||
                saveMutation.isPending
              }
              variant="outline"
            >
              Entregar a camioneta
            </Button>
            <Button
              type="button"
              onClick={openModal}
              disabled={!inventario.data?.length || inventario.isError || saveMutation.isPending}
              variant="default"
            >
              Registrar movimiento
            </Button>
          </div>
        }
      />
      {saveMutation.isSuccess ? (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Movimiento registrado correctamente.
        </p>
      ) : null}
      {entregaSuccess ? (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Entrega a camioneta registrada correctamente.
        </p>
      ) : null}
      {inventario.isLoading ? (
        <StateMessage title="Cargando bodega" description="Obteniendo saldos de productos." />
      ) : inventario.isError ? (
        <StateMessage title="No se pudo cargar la bodega" description={inventario.error.message} />
      ) : (
        <DataTable
          columns={inventarioColumns}
          data={inventario.data ?? []}
          searchPlaceholder="Buscar producto en bodega..."
          emptyMessage="No hay productos registrados. Crea productos en el catalogo primero."
        />
      )}
      <h3 className="mb-4 mt-8 text-xl font-bold text-slate-950">Historial de movimientos</h3>
      {movimientos.isLoading ? (
        <StateMessage title="Cargando movimientos" description="Obteniendo el historial de bodega." />
      ) : movimientos.isError && !movimientos.data ? (
        <StateMessage title="No se pudieron cargar los movimientos" description={movimientos.error.message} />
      ) : (
        <>
          <DataTable
            loadedOnly
            columns={movimientoColumns}
            data={movimientoRows}
            searchPlaceholder="Buscar en los movimientos cargados..."
            emptyMessage="No hay movimientos para mostrar."
          />
          <HistoryLoadMore query={movimientos} />
        </>
      )}
      <ConteosInventario />
      {isConteoOpen ? (
        <ConteoInventarioModal
          inventario={inventario.data}
          inventarioReady={inventario.isSuccess && !inventario.isFetching}
          onClose={() => setIsConteoOpen(false)}
        />
      ) : null}
      {isEntregaOpen ? (
        <EntregaCamionetaModal
          inventario={inventario.data}
          inventarioReady={inventario.isSuccess && !inventario.isFetching}
          onClose={() => setIsEntregaOpen(false)}
          onSuccess={() => {
            setIsEntregaOpen(false);
            setEntregaSuccess(true);
          }}
        />
      ) : null}
      {isModalOpen ? (
        <MovimientoBodegaModal
          inventario={inventario.data ?? []}
          selectedProduct={selectedProduct}
          form={form}
          isSaving={saveMutation.isPending}
          error={formError || (saveMutation.isError ? saveMutation.error?.message : undefined)}
          onChange={setForm}
          onSubmit={submitForm}
          onClose={closeModal}
        />
      ) : null}
    </section>
  );
};
