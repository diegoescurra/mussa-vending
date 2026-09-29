import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productosService, type CreateProductoDTO } from '../../../services/productos.service';

export const useProductosCrud = (onDone: () => void) => {
  const queryClient = useQueryClient();
  const invalidateProductos = () => queryClient.invalidateQueries({ queryKey: ['productos'] });

  const createMutation = useMutation({
    mutationFn: productosService.create,
    onSuccess: () => {
      invalidateProductos();
      onDone();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateProductoDTO }) => productosService.update(id, payload),
    onSuccess: () => {
      invalidateProductos();
      onDone();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productosService.delete,
    onSuccess: invalidateProductos,
  });

  return {
    createProducto: createMutation.mutate,
    updateProducto: updateMutation.mutate,
    deleteProducto: deleteMutation.mutate,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
};
