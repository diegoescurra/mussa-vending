import { useRef, useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { StateMessage } from '../../../components/StateMessage';
import { DataTable } from '../../../components/table/DataTable';
import { useMaquinas } from '../../../hooks/useMaquinas';
import type { Maquina } from '../../../services/maquinas.service';
import { MaquinaFormModal } from './MaquinaFormModal';
import { createMaquinaColumns } from './maquinas.columns';
import { emptyMaquinaForm, maquinaToForm, type MaquinaForm } from './maquinas.mapper';
import { useMaquinasCrud } from './useMaquinasCrud';
import { toMaquinaPayload, validateMaquinaForm, type MaquinaFormErrors } from './maquinas.validation';

export const MaquinasPage = () => {
  const { data = [], isLoading, isError } = useMaquinas();
  const [form, setForm] = useState<MaquinaForm>(emptyMaquinaForm);
  const [editingMaquina, setEditingMaquina] = useState<Maquina | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState<MaquinaFormErrors>({});
  const savePending = useRef(false);

  const closeModal = () => {
    if (savePending.current) return;
    setIsModalOpen(false);
    setEditingMaquina(null);
    setForm(emptyMaquinaForm);
    setErrors({});
  };

  const { createMaquina, updateMaquina, deleteMaquina, isSaving, saveError, resetErrors } = useMaquinasCrud(() => {
    savePending.current = false;
    closeModal();
  });

  const openCreateModal = () => {
    resetErrors();
    setErrors({});
    setEditingMaquina(null);
    setForm(emptyMaquinaForm);
    setIsModalOpen(true);
  };

  const openEditModal = (maquina: Maquina) => {
    resetErrors();
    setErrors({});
    setEditingMaquina(maquina);
    setForm(maquinaToForm(maquina));
    setIsModalOpen(true);
  };

  const submitForm = () => {
    if (savePending.current || isSaving) return;
    const nextErrors = validateMaquinaForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = toMaquinaPayload(form);
    savePending.current = true;
    const options = { onSettled: () => { savePending.current = false; } };
    if (editingMaquina) {
      updateMaquina({ id: editingMaquina.id_maquina, payload }, options);
      return;
    }

    createMaquina(payload, options);
  };

  const handleDelete = (maquina: Maquina) => {
    if (window.confirm(`¿Eliminar la máquina "${maquina.nombre}"?`)) {
      deleteMaquina(maquina.id_maquina);
    }
  };

  if (isLoading) return <StateMessage title="Cargando máquinas" description="Estamos obteniendo el estado de tus máquinas." />;
  if (isError) return <StateMessage title="No se pudieron cargar las máquinas" description="Revisa que el backend esté activo y vuelve a intentar." />;

  return (
    <section>
      <PageHeader
        title="Máquinas"
        description="Visualiza dónde está cada máquina y su estado operativo actual."
        actions={(
          <button type="button" onClick={openCreateModal} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Nueva máquina
          </button>
        )}
      />
      <DataTable columns={createMaquinaColumns({ onEdit: openEditModal, onDelete: handleDelete })} data={data} searchPlaceholder="Buscar máquina..." emptyMessage="No hay máquinas registradas" />
      {isModalOpen ? <MaquinaFormModal form={form} editingMaquina={editingMaquina} isSaving={isSaving} errors={errors} saveError={saveError} onChange={(nextForm) => { setForm(nextForm); if (Object.keys(errors).length) setErrors(validateMaquinaForm(nextForm)); }} onSubmit={submitForm} onClose={closeModal} /> : null}
    </section>
  );
};
