'use client';

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Inbox, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  tabs?: Tab[];
  onTabChange?: (tab: string) => void;
  activeTab?: string;
  searchPlaceholder?: string;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  // Phase 14M v3.25 — opcional: callback invocado al hacer click en cualquier
  // celda de la fila (excepto si el click viene de un elemento interactivo
  // anidado). Permite navegar al detalle del lote/pedido desde cualquier
  // parte de la caja, no solo desde el ID.
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  tabs,
  onTabChange,
  activeTab = 'all',
  searchPlaceholder = 'Buscar...',
  globalFilter = '',
  onGlobalFilterChange,
  isLoading = false,
  emptyMessage = 'No se encontraron resultados.',
  onRowClick,
}: DataTableProps<T>) {
  const [internalFilter, setInternalFilter] = useState('');
  const filter = onGlobalFilterChange ? globalFilter : internalFilter;
  const setFilter = onGlobalFilterChange ?? setInternalFilter;

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {tabs && (
          <div className="flex gap-0.5 bg-muted p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={cn(
                  'px-3.5 py-1.5 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer',
                  activeTab === tab.key
                    ? 'bg-card text-foreground shadow-soft-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-input rounded-input focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-card w-full sm:w-64 shadow-soft-sm hover:shadow-soft transition-all duration-200 placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card border border-border/50 bg-card overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-muted rounded-md animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3 animate-fade-in">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Inbox className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? (e) => {
                      // Solo navegar si el click NO viene de un elemento
                      // interactivo dentro de la fila (link, button, input).
                      // Si el usuario pulsa el ID que ya es un <Link>, el
                      // Link maneja la navegación y aquí no hacemos nada.
                      const target = e.target as HTMLElement;
                      if (target.closest('a, button, input, select, textarea, [role="button"]')) return;
                      onRowClick(row.original as T);
                    } : undefined}
                    className={cn(
                      'hover:bg-accent/50 transition-colors duration-150 animate-fade-in',
                      onRowClick && 'cursor-pointer',
                    )}
                    style={{ animationDelay: `${Math.min(idx * 40, 400)}ms`, animationFillMode: 'backwards' }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
