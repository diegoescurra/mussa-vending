import { useQuery } from '@tanstack/react-query';
import { usuariosService } from '../services/usuarios.service';

export const useUsuarios = () => {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosService.getAll,
    retry: false,
  });
};
