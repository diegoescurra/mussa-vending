import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { Modal } from '../../../components/Modal';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useProveedores } from '../../../hooks/useProveedores';
import type { Proveedor } from '../../../services/proveedores.service';
import { ProveedorFormModal } from './ProveedorFormModal';
import { useProveedoresCrud } from './useProveedoresCrud';
import {
  proveedorFormToCreatePayload,
  proveedorFormToUpdatePayload,
  validateProveedorForm,
  type ProveedorForm,
} from './proveedores.validation';

const emptyForm: ProveedorForm = { nombre: '', estado: 'true' };

export const ProveedoresPage = () => {
  const { data = [], isLoading, isError, refetch } = useProveedores();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Proveedor | null>(null);
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };
  const crud = useProveedoresCrud(closeForm, () => setDeleting(null));
  const busy = crud.isSaving || crud.isDeleting;
  const openForm = (proveedor: Proveedor | null) => {
    if (busy || deleting || formOpen) return;
    crud.resetErrors();
    setEditing(proveedor);
    setForm(proveedor ? { nombre: proveedor.nombre, estado: String(proveedor.estado) } : emptyForm);
    setFormOpen(true);
  };
  const submitForm = () => {
    if (busy || Object.keys(validateProveedorForm(form, Boolean(editing))).length) return;
    crud.resetErrors();
    if (editing) void crud.updateProveedor(editing.id_proveedor, proveedorFormToUpdatePayload(form));
    else void crud.createProveedor(proveedorFormToCreatePayload(form));
  };
  const columns: ColumnDef<Proveedor>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'estado',
      header: 'Estado',
      enableGlobalFilter: false,
      cell: ({ row }) => <StatusBadge active={row.original.estado} />,
    },
    {
      id: 'acciones',
      header: 'Acciones',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <fieldset
          disabled={busy || formOpen || Boolean(deleting)}
          aria-label={`Acciones de ${row.original.nombre}`}
        >
          <RowActions
            onEdit={() => openForm(row.original)}
            deleteDisabled={busy}
            onDelete={() => {
              if (busy || formOpen || deleting) return;
              crud.resetErrors();
              setDeleting(row.original);
            }}
          />
        </fieldset>
      ),
    },
  ];
  return (
    <section>
      <PageHeader
        title="Proveedores"
        description="Gestiona los proveedores del catalogo. Edita su estado para desactivarlos o reactivarlos."
        actions={
          <Button
            type="button"
            onClick={() => openForm(null)}
            disabled={busy || formOpen || Boolean(deleting)}
            variant="default"
          >
            Nuevo proveedor
          </Button>
        }
      />
      {isError ? (
        <>
          <StateMessage
            title="No se pudieron cargar los proveedores"
            description="Revisa la conexion e intenta de nuevo."
          />
          <Button type="button" onClick={() => void refetch()} variant="outline" className="mt-4">
            Reintentar
          </Button>
        </>
      ) : isLoading ? (
        <StateMessage title="Cargando proveedores" description="Consultando los proveedores registrados." />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          searchPlaceholder="Buscar proveedor por nombre..."
          emptyMessage="No hay proveedores para mostrar. Crea uno o cambia la busqueda."
        />
      )}
      {formOpen ? (
        <ProveedorFormModal
          form={form}
          editing={Boolean(editing)}
          isSaving={crud.isSaving}
          saveError={crud.saveError?.message}
          onChange={setForm}
          onClose={() => {
            if (busy) return;
            closeForm();
            crud.resetErrors();
          }}
          onSubmit={submitForm}
        />
      ) : null}
      {deleting ? (
        <Modal
          title="Eliminar proveedor"
          description={`Se eliminara "${deleting.nombre}". Sus productos quedaran sin proveedor; no se eliminaran productos.`}
          closeDisabled={crud.isDeleting}
          onClose={() => {
            if (busy) return;
            setDeleting(null);
            crud.resetErrors();
          }}
        >
          {crud.deleteError ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {crud.deleteError.message}
            </p>
          ) : null}
          <fieldset disabled={busy} aria-busy={crud.isDeleting} className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              onClick={() => {
                if (busy) return;
                setDeleting(null);
                crud.resetErrors();
              }}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!busy) void crud.deleteProveedor(deleting.id_proveedor);
              }}
              variant="destructive"
            >
              {crud.isDeleting ? 'Eliminando...' : 'Eliminar proveedor'}
            </Button>
          </fieldset>
        </Modal>
      ) : null}
    </section>
  );
};
