type StatusBadgeProps = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export const StatusBadge = ({ active, activeLabel = 'Activo', inactiveLabel = 'Inactivo' }: StatusBadgeProps) => {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  );
};
