import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { useInventarioMaquinas } from '../../../hooks/useInventarioMaquinas';
import { useMaquinas } from '../../../hooks/useMaquinas';
import { useProductos } from '../../../hooks/useProductos';
import type { MaquinaProductoDetalle } from '../../../services/maquina-productos.service';
import { InventarioFormModal } from './InventarioFormModal';
import { createInventarioColumns } from './inventario.columns';
import {
  emptyInventarioForm,
  inventarioFormToCreatePayload,
  inventarioFormToUpdatePayload,
  inventarioToForm,
  type InventarioForm,
} from './inventario.mapper';
import { MachineInventoryHeader } from './MachineInventoryHeader';
import { useInventarioCrud } from './useInventarioCrud';

export const InventarioPage = () => {
  const { data = [], isLoading, isError } = useInventarioMaquinas();
  const { data: maquinas = [], isLoading: isLoadingMaquinas } = useMaquinas();
  const { data: productos = [], isLoading: isLoadingProductos } = useProductos();
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [form, setForm] = useState<InventarioForm>(emptyInventarioForm);
  const [editingItem, setEditingItem] = useState<MaquinaProductoDetalle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeMachineId = selectedMachineId || (maquinas[0]?.id_maquina ? String(maquinas[0].id_maquina) : '');
  const activeMachine = maquinas.find((maquina) => String(maquina.id_maquina) === activeMachineId);
  const selectedMachineItems = data.filter((item) => String(item.id_maquina) === activeMachineId);
  const selectedProductIds = new Set(selectedMachineItems.map((item) => item.id_producto));
  const availableProducts = productos.filter((producto) => !selectedProductIds.has(producto.id_producto));

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(emptyInventarioForm);
  };

  const { createInventario, updateInventario, deleteInventario, isSaving, saveError, resetSave } = useInventarioCrud(closeModal);

  const openCreateModal = () => {
    if (isSaving) return;
    resetSave();
    setEditingItem(null);
    setForm({ ...emptyInventarioForm, id_maquina: activeMachineId });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MaquinaProductoDetalle) => {
    if (isSaving) return;
    resetSave();
    setEditingItem(item);
    setForm(inventarioToForm(item));
    setIsModalOpen(true);
  };

  const submitForm = () => {
    if (isSaving) return;
    resetSave();
    if (editingItem) {
      updateInventario({ id: editingItem.id_maquina_producto, payload: inventarioFormToUpdatePayload(form) });
      return;
    }

    createInventario(inventarioFormToCreatePayload({ ...form, id_maquina: activeMachineId }));
  };

  const handleDelete = (item: MaquinaProductoDetalle) => {
    if (window.confirm(`¿Quitar "${item.producto_nombre}" de la máquina ${item.maquina_codigo}?`)) {
      deleteInventario(item.id_maquina_producto);
    }
  };

  return (
    <section>
      <PageHeader
        title="Inventario por máquina"
        description="Selecciona una máquina y añade productos con su stock inicial, capacidad y precio de venta."
        actions={(
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!activeMachineId || availableProducts.length === 0}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Añadir producto a esta máquina
          </button>
        )}
      />

      <MachineInventoryHeader
        machines={maquinas}
        selectedMachineId={activeMachineId}
        isLoadingMachines={isLoadingMaquinas}
        productCount={selectedMachineItems.length}
        onSelectMachine={setSelectedMachineId}
      />

      {isError ? (
        <StateMessage title="No se pudo cargar el inventario" description="Puedes seleccionar máquinas, pero revisa que el endpoint /api/maquina-productos responda correctamente." />
      ) : isLoading ? (
        <StateMessage title="Cargando productos de la máquina" description="Mientras tanto puedes revisar la máquina seleccionada." />
      ) : (
        <DataTable
          columns={createInventarioColumns({ onEdit: openEditModal, onDelete: handleDelete })}
          data={selectedMachineItems}
          searchPlaceholder="Buscar producto dentro de esta máquina..."
          emptyMessage="Esta máquina aún no tiene productos asignados"
        />
      )}

      {isModalOpen ? (
        <InventarioFormModal
          form={form}
          activeMachine={activeMachine}
          productos={productos}
          availableProducts={availableProducts}
          editingItem={editingItem}
          isLoadingProductos={isLoadingProductos}
          isSaving={isSaving}
          saveError={saveError?.message}
          onChange={setForm}
          onSubmit={submitForm}
          onClose={() => {
            if (isSaving) return;
            closeModal();
            resetSave();
          }}
        />
      ) : null}
    </section>
  );
};
