import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maquinaProductosService, type UpdateMaquinaProductoDTO } from '../../../services/maquina-productos.service';

export const useInventarioCrud = (onDone: () => void) => {
  const queryClient = useQueryClient();
  const invalidateInventario = () => queryClient.invalidateQueries({ queryKey: ['inventario-maquinas'] });

  const createMutation = useMutation({
    mutationFn: maquinaProductosService.create,
    onSuccess: () => {
      invalidateInventario();
      onDone();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMaquinaProductoDTO }) => maquinaProductosService.update(id, payload),
    onSuccess: () => {
      invalidateInventario();
      onDone();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: maquinaProductosService.delete,
    onSuccess: invalidateInventario,
  });

  return {
    createInventario: createMutation.mutate,
    updateInventario: updateMutation.mutate,
    deleteInventario: deleteMutation.mutate,
    isSaving: createMutation.isPending || updateMutation.isPending,
    saveError: createMutation.error ?? updateMutation.error,
    resetSave: () => {
      createMutation.reset();
      updateMutation.reset();
    },
  };
};
