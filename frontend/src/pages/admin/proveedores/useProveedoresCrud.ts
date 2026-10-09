import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { proveedoresService, type CreateProveedorDTO, type UpdateProveedorDTO } from '../../../services/proveedores.service';

export const useProveedoresCrud = (onSaved: () => void, onDeleted: () => void) => {
  const queryClient = useQueryClient();
  const pending = useRef(false);
  const invalidate = () => Promise.all(
    ['proveedores', 'productos', 'inventario-maquinas', 'dashboard'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })),
  );
  const create = useMutation({
    mutationFn: proveedoresService.create,
    onSuccess: async () => { await invalidate(); onSaved(); },
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProveedorDTO }) => proveedoresService.update(id, payload),
    onSuccess: async () => { await invalidate(); onSaved(); },
  });
  const remove = useMutation({
    mutationFn: proveedoresService.delete,
    onSuccess: async () => { await invalidate(); onDeleted(); },
  });

  // Lock synchronously as well as disabling the UI to prevent same-tick submissions.
  const run = async (operation: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true;
    try { await operation(); } catch { /* Mutation errors remain available to the modal. */ }
    finally { pending.current = false; }
  };

  return {
    createProveedor: (payload: CreateProveedorDTO) => run(() => create.mutateAsync(payload)),
    updateProveedor: (id: number, payload: UpdateProveedorDTO) => run(() => update.mutateAsync({ id, payload })),
    deleteProveedor: (id: number) => run(() => remove.mutateAsync(id)),
    isSaving: create.isPending || update.isPending,
    isDeleting: remove.isPending,
    saveError: create.error ?? update.error,
    deleteError: remove.error,
    resetErrors: () => {
      if (pending.current) return;
      create.reset();
      update.reset();
      remove.reset();
    },
  };
};
