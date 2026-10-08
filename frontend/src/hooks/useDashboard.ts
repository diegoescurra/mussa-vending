import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

export const useDashboard = (desde: string, hasta: string) => useQuery({
  queryKey: ['dashboard', desde, hasta],
  queryFn: () => dashboardService.get(desde, hasta),
  refetchOnMount: 'always',
  retry: false,
});
