import type { ColumnDef } from '@tanstack/react-table';
import { RowActions } from '../../../components/table/RowActions';
import type { Maquina } from '../../../services/maquinas.service';

type MaquinaColumnsParams = {
  onEdit: (maquina: Maquina) => void;
  onDelete: (maquina: Maquina) => void;
};

const stateClasses = {
  ACTIVA: 'bg-emerald-100 text-emerald-700',
  INACTIVA: 'bg-slate-100 text-slate-600',
  MANTENCION: 'bg-amber-100 text-amber-700',
};

export const createMaquinaColumns = ({ onEdit, onDelete }: MaquinaColumnsParams): ColumnDef<Maquina>[] => [
  { accessorKey: 'codigo', header: 'Código' },
  { accessorKey: 'nombre', header: 'Nombre' },
  { accessorKey: 'ubicacion', header: 'Ubicación' },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stateClasses[row.original.estado]}`}>{row.original.estado}</span>,
  },
  { accessorKey: 'descripcion', header: 'Descripción' },
  {
    id: 'acciones',
    header: 'Acciones',
    cell: ({ row }) => <RowActions onEdit={() => onEdit(row.original)} onDelete={() => onDelete(row.original)} />,
  },
];
