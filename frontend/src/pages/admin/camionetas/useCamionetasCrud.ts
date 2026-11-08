import { useConfirm } from "@/hooks/useConfirm";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { usuariosService } from '../../../services/usuarios.service';
import { camionetasService, type Camioneta, type CamionetaPayload } from '../../../services/camionetas.service';

const emptyForm = { patente: '', nombre: '', id_repartidor: '', estado: 'true' };

export type CamionetaForm = typeof emptyForm;

export const useCamionetasCrud = () => {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const camionetas = useQuery({ queryKey: ['camionetas'], queryFn: camionetasService.getAll });
  const usuarios = useQuery({ queryKey: ['usuarios', 'reponedores'], queryFn: usuariosService.getReponedores });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Camioneta | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const mutationLock = useRef(false);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: CamionetaPayload }) => (
      id === undefined ? camionetasService.create(payload) : camionetasService.update(id, payload)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['camionetas'] });
      setIsModalOpen(false);
    },
    onSettled: () => { mutationLock.current = false; },
  });
  const deleteMutation = useMutation({
    mutationFn: camionetasService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['camionetas'] }),
    onSettled: () => { mutationLock.current = false; },
  });
  const isPending = saveMutation.isPending || deleteMutation.isPending;

  const assignedIds = new Set(
    (camionetas.data ?? [])
      .filter((camioneta) => camioneta.id_camioneta !== editing?.id_camioneta)
      .map((camioneta) => camioneta.id_repartidor),
  );
  const availableUsers = (usuarios.data ?? []).filter(
    (usuario) => !assignedIds.has(usuario.id_usuario),
  );
  const selectedUser = availableUsers.find((usuario) => usuario.id_usuario === Number(form.id_repartidor));
  const options = availableUsers.map((usuario) => ({
    value: usuario.id_usuario,
    label: `${usuario.nombre} ${usuario.apellido}`.trim(),
  }));
  const currentUnavailable = editing !== null && !availableUsers.some((usuario) => usuario.id_usuario === editing.id_repartidor);
  if (currentUnavailable) {
    options.unshift({
      value: editing.id_repartidor,
      label: `${editing.repartidor_nombre} ${editing.repartidor_apellido} (actual, no disponible)`.trim(),
    });
  }
  const canSave = usuarios.isSuccess && !usuarios.isError && camionetas.isSuccess && !camionetas.isError
    && !!selectedUser && !!form.patente.trim() && !!form.nombre.trim();

  const openModal = (camioneta: Camioneta | null = null) => {
    if (mutationLock.current) return;
    saveMutation.reset();
    deleteMutation.reset();
    setFormError('');
    setEditing(camioneta);
    setForm(camioneta ? {
      patente: camioneta.patente,
      nombre: camioneta.nombre,
      id_repartidor: String(camioneta.id_repartidor),
      estado: String(camioneta.estado),
    } : emptyForm);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    if (!mutationLock.current && !isPending) setIsModalOpen(false);
  };
  const submitForm = () => {
    if (mutationLock.current || isPending) return;
    if (!canSave || !selectedUser) {
      setFormError('Completa los campos y selecciona un REPONEDOR activo y disponible. Los usuarios y camionetas deben cargarse correctamente.');
      return;
    }
    setFormError('');
    mutationLock.current = true;
    saveMutation.mutate({
      id: editing?.id_camioneta,
      payload: {
        patente: form.patente.trim(),
        nombre: form.nombre.trim(),
        id_repartidor: selectedUser.id_usuario,
        estado: form.estado === 'true',
      },
    });
  };
  const deleteCamioneta = async (camioneta: Camioneta) => {
    if (mutationLock.current || isPending || isModalOpen) return;
    if (!await confirm(`Eliminar la camioneta "${camioneta.nombre}" (${camioneta.patente})?`)) return;
    deleteMutation.reset();
    mutationLock.current = true;
    deleteMutation.mutate(camioneta.id_camioneta);
  };

  return {
    camionetas, usuarios, isModalOpen, editing, form, setForm, formError, saveMutation, deleteMutation,
    isPending, availableUsers, options, currentUnavailable, canSave, openModal, closeModal, submitForm, deleteCamioneta,
  };
};
