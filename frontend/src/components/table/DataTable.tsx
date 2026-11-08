import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useDeferredValue, useState } from 'react';
import {
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Filter = { column: string; label: string; options: { value: string; label: string }[] };
type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  filters?: Filter[];
  loadedOnly?: boolean;
};
const numericColumn = (id: string) =>
  /precio|costo|cantidad|stock|capacidad|dinero|venta|diferencia/.test(id);
export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay datos para mostrar',
  filters = [],
  loadedOnly = false,
}: DataTableProps<TData>) {
  'use no memo'; // TanStack Table v8 expone una instancia mutable.
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const deferredFilter = useDeferredValue(globalFilter);
  // eslint-disable-next-line react-hooks/incompatible-library -- Esta integración está excluida de React Compiler con use no memo.
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: deferredFilter, columnFilters },
    initialState: { pagination: { pageSize: 25 } },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const total = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  return (
    <div
      role="region"
      aria-label={searchPlaceholder}
      className="min-w-0 overflow-hidden rounded-xl border bg-white shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label={searchPlaceholder}
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="bg-white pl-9 shadow-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 [&>[data-slot=native-select-wrapper]]:w-auto">
          {filters.map((filter) => (
            <NativeSelect
              key={filter.column}
              aria-label={filter.label}
              value={String(table.getColumn(filter.column)?.getFilterValue() ?? '')}
              onChange={(event) =>
                table.getColumn(filter.column)?.setFilterValue(event.target.value || undefined)
              }
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          ))}
        </div>
      </div>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-slate-50">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'h-11 px-4 text-xs font-medium text-muted-foreground',
                    (numericColumn(header.id) || header.id === 'acciones') && 'text-right',
                  )}
                  aria-sort={
                    header.column.getIsSorted() === 'asc'
                      ? 'ascending'
                      : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : undefined
                  }
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={header.column.getToggleSortingHandler()}
                      className="-mx-2 h-7 px-2 text-xs hover:bg-slate-100"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="size-3" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </Button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-slate-50/70">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'h-14 px-4 py-3 text-sm text-slate-600',
                      numericColumn(cell.column.id) && 'text-right tabular-nums',
                      cell.column.id === 'acciones' && 'w-24 text-right',
                      cell.column.id === 'nombre' && 'font-medium text-foreground',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {!rows.length ? (
        <div className="flex min-h-44 flex-col items-center justify-center px-4 py-8 text-center">
          <Inbox className="mb-3 size-6 text-slate-400" />
          <p className="text-sm text-muted-foreground">
            {globalFilter || columnFilters.length
              ? 'No se encontraron resultados con estos filtros.'
              : emptyMessage}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        <p role="status">
          {total ? pageIndex * pageSize + 1 : 0}–{Math.min((pageIndex + 1) * pageSize, total)} de {total}{' '}
          registros{loadedOnly ? ' cargados' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-3 [&>[data-slot=native-select-wrapper]]:w-auto">
          <NativeSelect
            size="sm"
            aria-label="Filas por página"
            value={pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </NativeSelect>
          <span>
            Página {pageIndex + 1} de {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Primera página"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.firstPage()}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Página anterior"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Página siguiente"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Última página"
              disabled={!table.getCanNextPage()}
              onClick={() => table.lastPage()}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
