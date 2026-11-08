import { useConfirm } from '@/hooks/useConfirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useUsuarios } from '../../../hooks/useUsuarios';
import {
  usuariosService,
  type Usuario,
  type CreateUsuarioDTO,
  type UpdateUsuarioDTO,
} from '../../../services/usuarios.service';

const emptyForm = { password: '', nombre: '', apellido: '', email: '', rol: 'REPONEDOR', estado: 'true' };

export type UsuarioForm = typeof emptyForm;

export const useUsuariosCrud = () => {
  const confirm = useConfirm();
  const usuarios = useUsuarios();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const mutationLock = useRef(false);
  const refreshUsuarios = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
      queryClient.invalidateQueries({ queryKey: ['camionetas'] }),
      queryClient.invalidateQueries({ queryKey: ['camioneta'] }),
    ]);
  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: CreateUsuarioDTO & UpdateUsuarioDTO }) =>
      id === undefined
        ? usuariosService.create(payload)
        : usuariosService.update(id, { ...payload, password: payload.password || undefined }),
    onSuccess: async () => {
      setIsModalOpen(false);
      await refreshUsuarios();
    },
    onSettled: () => {
      mutationLock.current = false;
    },
  });
  const deleteMutation = useMutation({
    mutationFn: usuariosService.delete,
    onSuccess: refreshUsuarios,
    onSettled: () => {
      mutationLock.current = false;
    },
  });
  const isPending = saveMutation.isPending || deleteMutation.isPending;
  const closeModal = () => {
    if (!mutationLock.current) setIsModalOpen(false);
  };
  const openModal = (usuario: Usuario | null = null) => {
    if (mutationLock.current) return;
    saveMutation.reset();
    deleteMutation.reset();
    setFormError('');
    setEditing(usuario);
    setForm(
      usuario
        ? {
            password: '',
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            rol: usuario.rol,
            estado: String(usuario.estado),
          }
        : emptyForm,
    );
    setIsModalOpen(true);
  };
  const submitForm = () => {
    if (mutationLock.current) return;
    if (
      !form.nombre.trim() ||
      !form.apellido.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setFormError('Completa nombre, apellido y un email valido.');
      return;
    }
    setFormError('');
    mutationLock.current = true;
    saveMutation.mutate({
      id: editing?.id_usuario,
      payload: {
        password: form.password,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        rol: form.rol,
        ...(editing ? { estado: form.estado === 'true' } : {}),
      },
    });
  };
  const deleteUsuario = async (usuario: Usuario) => {
    if (
      mutationLock.current ||
      isModalOpen ||
      !(await confirm(
        `Eliminar a ${usuario.nombre} ${usuario.apellido}? Si tiene historial, debes desactivarlo.`,
      ))
    )
      return;
    deleteMutation.reset();
    mutationLock.current = true;
    deleteMutation.mutate(usuario.id_usuario);
  };
  return {
    usuarios,
    isModalOpen,
    editing,
    form,
    setForm,
    formError,
    saveMutation,
    deleteMutation,
    isPending,
    closeModal,
    openModal,
    submitForm,
    deleteUsuario,
  };
};
