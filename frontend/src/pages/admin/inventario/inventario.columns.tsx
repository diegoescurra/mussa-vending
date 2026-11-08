import type { ColumnDef } from '@tanstack/react-table';
import { RowActions } from '../../../components/table/RowActions';
import { MoneyText } from '../../../components/ui/MoneyText';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { MaquinaProductoDetalle } from '../../../services/maquina-productos.service';
import { StockCell } from './StockCell';

type InventarioColumnsParams = {
  onEdit: (item: MaquinaProductoDetalle) => void;
  onDelete: (item: MaquinaProductoDetalle) => void;
};

export const createInventarioColumns = ({
  onEdit,
  onDelete,
}: InventarioColumnsParams): ColumnDef<MaquinaProductoDetalle>[] => [
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
    cell: ({ row }) => (
      <StockCell stock={row.original.stock_actual} capacity={row.original.capacidad_maxima} />
    ),
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
    cell: ({ row }) => (
      <RowActions onEdit={() => onEdit(row.original)} onDelete={() => onDelete(row.original)} />
    ),
  },
];
