export const StockCell = ({ stock, capacity }: { stock: number; capacity: number }) => {
  const percentage = capacity > 0 ? Math.round((stock / capacity) * 100) : 0;
  const isLowStock = percentage <= 25;

  return (
    <div className="min-w-32">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-900">
          {stock}/{capacity}
        </span>
        <span className={isLowStock ? 'text-amber-700' : 'text-slate-500'}>{percentage}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${isLowStock ? 'bg-amber-400' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};
