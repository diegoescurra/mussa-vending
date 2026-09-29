import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { useProductos } from '../../../hooks/useProductos';
import { useProveedores } from '../../../hooks/useProveedores';
import type { Producto } from '../../../services/productos.service';
import { ProductoFormModal } from './ProductoFormModal';
import { createProductoColumns } from './productos.columns';
import { emptyProductoForm, productoFormToPayload, productoToForm, type ProductoForm } from './productos.mapper';
import { useProductosCrud } from './useProductosCrud';

export const ProductosPage = () => {
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

  const { createProducto, updateProducto, deleteProducto, isSaving } = useProductosCrud(closeModal);

  const openCreateModal = () => {
    setEditingProducto(null);
    setForm(emptyProductoForm);
    setIsModalOpen(true);
  };

  const openEditModal = (producto: Producto) => {
    setEditingProducto(producto);
    setForm(productoToForm(producto));
    setIsModalOpen(true);
  };

  const submitForm = () => {
    const payload = productoFormToPayload(form);

    if (editingProducto) {
      updateProducto({ id: editingProducto.id_producto, payload });
      return;
    }

    createProducto(payload);
  };

  const handleDelete = (producto: Producto) => {
    if (window.confirm(`¿Eliminar el producto "${producto.nombre}"?`)) {
      deleteProducto(producto.id_producto);
    }
  };

  if (isLoading) return <StateMessage title="Cargando productos" description="Estamos obteniendo el catálogo desde el servidor." />;
  if (isError) return <StateMessage title="No se pudieron cargar los productos" description="Revisa que el backend esté activo y vuelve a intentar." />;

  return (
    <section>
      <PageHeader
        title="Productos"
        description="Consulta rápidamente precios, costos y disponibilidad del catálogo."
        actions={(
          <button type="button" onClick={openCreateModal} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Nuevo producto
          </button>
        )}
      />
      <DataTable columns={createProductoColumns({ onEdit: openEditModal, onDelete: handleDelete })} data={data} searchPlaceholder="Buscar producto..." emptyMessage="No hay productos registrados" />
      {isModalOpen ? (
        <ProductoFormModal
          form={form}
          proveedores={proveedores}
          editingProducto={editingProducto}
          isSaving={isSaving}
          onChange={setForm}
          onSubmit={submitForm}
          onClose={closeModal}
        />
      ) : null}
    </section>
  );
};
