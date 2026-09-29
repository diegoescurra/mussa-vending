import { useQuery } from '@tanstack/react-query';
import { maquinaProductosService } from '../services/maquina-productos.service';

export const useInventarioMaquinas = () => {
  return useQuery({
    queryKey: ['inventario-maquinas'],
    queryFn: maquinaProductosService.getAll,
  });
};
