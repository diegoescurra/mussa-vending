import type { ColumnDef } from '@tanstack/react-table';
import { RowActions } from '../../../components/table/RowActions';
import { MoneyText } from '../../../components/ui/MoneyText';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Producto } from '../../../services/productos.service';
import type { Proveedor } from '../../../services/proveedores.service';

type ProductoColumnsParams = {
  onEdit: (producto: Producto) => void;
  onDelete: (producto: Producto) => void;
  isDeleting: boolean;
  proveedores: Proveedor[];
};

export const createProductoColumns = ({
  onEdit,
  onDelete,
  isDeleting,
  proveedores,
}: ProductoColumnsParams): ColumnDef<Producto>[] => [
  { accessorKey: 'nombre', header: 'Nombre' },
  {
    id: 'proveedor_nombre',
    accessorFn: (producto) =>
      proveedores.find((proveedor) => proveedor.id_proveedor === producto.id_proveedor)?.nombre ??
      'Sin proveedor',
    header: 'Proveedor',
    filterFn: 'equalsString',
  },
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
    filterFn: (row, id, value) => String(row.getValue(id)) === value,
    cell: ({ row }) => <StatusBadge active={row.original.estado} />,
  },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => (
      <RowActions
        onEdit={() => onEdit(row.original)}
        onDelete={() => onDelete(row.original)}
        deleteDisabled={isDeleting}
      />
    ),
  },
];
