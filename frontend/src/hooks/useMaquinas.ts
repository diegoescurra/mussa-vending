import { useQuery } from '@tanstack/react-query';
import { maquinasService } from '../services/maquinas.service';

export const useMaquinas = () => {
  return useQuery({
    queryKey: ['maquinas'],
    queryFn: maquinasService.getAll,
  });
};
