import type { ColumnDef } from '@tanstack/react-table';
import { RowActions } from '../../../components/table/RowActions';
import { MoneyText } from '../../../components/ui/MoneyText';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { MaquinaProductoDetalle } from '../../../services/maquina-productos.service';

type InventarioColumnsParams = {
  onEdit: (item: MaquinaProductoDetalle) => void;
  onDelete: (item: MaquinaProductoDetalle) => void;
};

export const createInventarioColumns = ({ onEdit, onDelete }: InventarioColumnsParams): ColumnDef<MaquinaProductoDetalle>[] => [
  {
    accessorKey: 'producto_nombre',
    header: 'Producto',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-900">{row.original.producto_nombre}</p>
        <p className="text-xs text-slate-500">{row.original.proveedor_nombre ?? 'Sin proveedor'}</p>
      </div>
    ),
  },
  {
    accessorKey: 'stock_actual',
    header: 'Stock',
    cell: ({ row }) => <StockCell stock={row.original.stock_actual} capacity={row.original.capacidad_maxima} />,
  },
  {
    accessorKey: 'precio_venta_actual',
    header: 'Precio actual',
    cell: ({ row }) => <MoneyText value={row.original.precio_venta_actual} />,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge active={row.original.estado} />,
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => <RowActions onEdit={() => onEdit(row.original)} onDelete={() => onDelete(row.original)} />,
  },
];

const StockCell = ({ stock, capacity }: { stock: number; capacity: number }) => {
  const percentage = capacity > 0 ? Math.round((stock / capacity) * 100) : 0;
  const isLowStock = percentage <= 25;

  return (
    <div className="min-w-32">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-900">{stock}/{capacity}</span>
        <span className={isLowStock ? 'text-amber-700' : 'text-slate-500'}>{percentage}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${isLowStock ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
};
