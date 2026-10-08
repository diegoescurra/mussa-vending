import type { ColumnDef } from '@tanstack/react-table';
import { RowActions } from '../../../components/table/RowActions';
import { MoneyText } from '../../../components/ui/MoneyText';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Producto } from '../../../services/productos.service';

type ProductoColumnsParams = {
  onEdit: (producto: Producto) => void;
  onDelete: (producto: Producto) => void;
  isDeleting: boolean;
};

export const createProductoColumns = ({ onEdit, onDelete, isDeleting }: ProductoColumnsParams): ColumnDef<Producto>[] => [
  { accessorKey: 'id_producto', header: 'ID' },
  { accessorKey: 'nombre', header: 'Nombre' },
  {
    accessorKey: 'precio_venta',
    header: 'Precio venta',
    cell: ({ row }) => <MoneyText value={row.original.precio_venta} />,
  },
  {
    accessorKey: 'costo_compra',
    header: 'Costo compra',
    cell: ({ row }) => <MoneyText value={row.original.costo_compra} />,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge active={row.original.estado} />,
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => <RowActions onEdit={() => onEdit(row.original)} onDelete={() => onDelete(row.original)} deleteDisabled={isDeleting} />,
  },
];
