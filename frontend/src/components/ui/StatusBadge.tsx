import { Badge } from './badge';
import { cn } from '@/lib/utils';
type StatusBadgeProps = { active: boolean; activeLabel?: string; inactiveLabel?: string };
export function StatusBadge({
  active,
  activeLabel = 'Activo',
  inactiveLabel = 'Inactivo',
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-md border-transparent font-medium',
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
      )}
    >
      <span className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-400')} />
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
