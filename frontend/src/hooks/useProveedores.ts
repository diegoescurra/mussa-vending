import { useQuery } from '@tanstack/react-query';
import { proveedoresService } from '../services/proveedores.service';

export const useProveedores = () => {
  return useQuery({
    queryKey: ['proveedores'],
    queryFn: proveedoresService.getAll,
  });
};
