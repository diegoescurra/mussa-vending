import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maquinasService, type CreateMaquinaDTO } from '../../../services/maquinas.service';

export const useMaquinasCrud = (onDone: () => void) => {
  const queryClient = useQueryClient();
  const invalidateMaquinas = () => queryClient.invalidateQueries({ queryKey: ['maquinas'] });

  const createMutation = useMutation({
    mutationFn: maquinasService.create,
    onSuccess: () => {
      invalidateMaquinas();
      onDone();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateMaquinaDTO }) => maquinasService.update(id, payload),
    onSuccess: () => {
      invalidateMaquinas();
      onDone();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: maquinasService.delete,
    onSuccess: invalidateMaquinas,
  });

  return {
    createMaquina: createMutation.mutate,
    updateMaquina: updateMutation.mutate,
    deleteMaquina: deleteMutation.mutate,
    isSaving: createMutation.isPending || updateMutation.isPending,
    saveError: createMutation.error ?? updateMutation.error,
    resetErrors: () => { createMutation.reset(); updateMutation.reset(); },
  };
};
