import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
export const useSession = () =>
  useQuery({
    queryKey: ['auth'],
    queryFn: authService.session,
    retry: false,
    staleTime: 30_000,
  });
export const homeFor = (role: string) => {
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'BODEGUERO') return '/admin/bodega';
  if (role === 'REPONEDOR') return '/reposicion';
  return '/login';
};
