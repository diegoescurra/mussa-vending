import { useConfirm } from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { useProductos } from '../../../hooks/useProductos';
import { useProveedores } from '../../../hooks/useProveedores';
import type { Producto } from '../../../services/productos.service';
import { ProductoFormModal } from './ProductoFormModal';
import { createProductoColumns } from './productos.columns';
import {
  emptyProductoForm,
  productoFormToPayload,
  productoToForm,
  type ProductoForm,
} from './productos.mapper';
import { useProductosCrud } from './useProductosCrud';

export const ProductosPage = () => {
  const confirm = useConfirm();
  const { data = [], isLoading, isError } = useProductos();
  const { data: proveedores = [] } = useProveedores();
  const [form, setForm] = useState<ProductoForm>(emptyProductoForm);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProducto(null);
    setForm(emptyProductoForm);
  };

  const {
    createProducto,
    updateProducto,
    deleteProducto,
    isSaving,
    saveError,
    resetSave,
    deleteError,
    deleteProductoName,
    isDeleting,
    resetDelete,
  } = useProductosCrud(closeModal);

  const openCreateModal = () => {
    if (isSaving) return;
    resetSave();
    setEditingProducto(null);
    setForm(emptyProductoForm);
    setIsModalOpen(true);
  };

  const openEditModal = (producto: Producto) => {
    if (isSaving) return;
    resetSave();
    setEditingProducto(producto);
    setForm(productoToForm(producto));
    setIsModalOpen(true);
  };

  const submitForm = () => {
    if (isSaving) return;
    const payload = productoFormToPayload(form);

    if (editingProducto) {
      updateProducto({ id: editingProducto.id_producto, payload });
      return;
    }

    createProducto(payload);
  };

  const handleDelete = async (producto: Producto) => {
    if (isDeleting) return;
    if (await confirm(`¿Eliminar el producto "${producto.nombre}"?`)) {
      deleteProducto(producto);
    }
  };

  if (isLoading)
    return (
      <StateMessage
        title="Cargando productos"
        description="Estamos obteniendo el catálogo desde el servidor."
      />
    );
  if (isError)
    return (
      <StateMessage
        title="No se pudieron cargar los productos"
        description="Revisa que el backend esté activo y vuelve a intentar."
      />
    );

  return (
    <section>
      <PageHeader
        title="Productos"
        description="Consulta rápidamente precios, costos y disponibilidad del catálogo."
        actions={
          <Button type="button" onClick={openCreateModal} variant="default">
            Nuevo producto
          </Button>
        }
      />
      {deleteError ? (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h3 className="font-semibold">No se pudo eliminar "{deleteProductoName}"</h3>
            <p className="mt-1 text-sm leading-6">{deleteError.message}</p>
          </div>
          <Button type="button" onClick={resetDelete} variant="outline" className="shrink-0 self-start">
            Cerrar aviso
          </Button>
        </div>
      ) : null}
      {isDeleting ? (
        <p role="status" className="mb-4 text-sm text-slate-600">
          Eliminando "{deleteProductoName}"...
        </p>
      ) : null}
      <DataTable
        columns={createProductoColumns({
          onEdit: openEditModal,
          onDelete: handleDelete,
          isDeleting,
          proveedores,
        })}
        data={data}
        searchPlaceholder="Buscar producto..."
        emptyMessage="No hay productos registrados"
        filters={[
          {
            column: 'proveedor_nombre',
            label: 'Todos los proveedores',
            options: proveedores.map((proveedor) => ({ value: proveedor.nombre, label: proveedor.nombre })),
          },
          {
            column: 'estado',
            label: 'Todos los estados',
            options: [
              { value: 'true', label: 'Activos' },
              { value: 'false', label: 'Inactivos' },
            ],
          },
        ]}
      />
      {isModalOpen ? (
        <ProductoFormModal
          form={form}
          proveedores={proveedores}
          editingProducto={editingProducto}
          isSaving={isSaving}
          saveError={saveError}
          onChange={setForm}
          onSubmit={submitForm}
          onClose={closeModal}
        />
      ) : null}
    </section>
  );
};
