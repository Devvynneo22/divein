import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef as TanColumnDef,
} from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import type { TableDef, TableRow, TableFilter, TableSort, ColumnDef } from '@/shared/types/table';
import { evaluateFormula } from '@/shared/lib/formulaEngine';
import { CellEditor } from './CellEditor';
import { ColumnHeader } from './ColumnHeader';
import { useUpdateCell, useCreateRow, useDeleteRow, useUpdateColumn, useDeleteColumn, useAddColumn } from '../hooks/useTables';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditingCell {
  rowId: string;
  columnId: string;
}

interface TableGridProps {
  table: TableDef;
  rows: TableRow[];
  filters: TableFilter[];
  sorts: TableSort[];
  onSortsChange: (sorts: TableSort[]) => void;
  onShowAddColumn: () => void;
}

// ─── Cell display renderer ────────────────────────────────────────────────────

function FormulaCell({
  column,
  row,
  allColumns,
}: {
  column: ColumnDef;
  row: Record<string, unknown>;
  allColumns: ColumnDef[];
}) {
  const result = evaluateFormula(column.formula ?? '', row, allColumns);
  const isError = typeof result === 'string' && result.startsWith('#');

  return (
    <div className="w-full h-full flex items-center px-2 gap-1.5 select-none">
      <span
        className="text-[9px] font-bold italic leading-none text-[var(--color-text-muted)] flex-shrink-0"
        title={`Formula: ${column.formula}`}
      >
        ƒ
      </span>
      <span
        className={`text-xs truncate ${
          isError
            ? 'text-[var(--color-danger)] font-medium'
            : typeof result === 'boolean'
              ? result
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-text-muted)]'
              : 'text-[var(--color-text-primary)]'
        }`}
      >
        {typeof result === 'boolean' ? (result ? 'TRUE' : 'FALSE') : String(result)}
      </span>
    </div>
  );
}

function DisplayCell({ column, value }: { column: ColumnDef; value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[var(--color-text-muted)] text-xs italic">—</span>;
  }

  switch (column.type) {
    case 'checkbox':
      return (
        <span className={value ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}>
          {value ? '☑' : '☐'}
        </span>
      );

    case 'date': {
      const str = String(value);
      try {
        const d = parseISO(str);
        if (isValid(d)) {
          return <span className="text-xs text-[var(--color-text-secondary)]">{format(d, 'MMM d, yyyy')}</span>;
        }
      } catch {
        // fall through
      }
      return <span className="text-xs text-[var(--color-text-secondary)]">{str}</span>;
    }

    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {arr.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[10px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }

    case 'select':
      return (
        <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs">
          {String(value)}
        </span>
      );

    case 'url':
      return (
        <span className="text-xs text-[var(--color-accent)] truncate underline">
          {String(value)}
        </span>
      );

    default:
      return <span className="text-xs text-[var(--color-text-primary)] truncate">{String(value)}</span>;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<TableRow>();

export function TableGrid({
  table,
  rows,
  onSortsChange,
  onShowAddColumn,
}: TableGridProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);

  const updateCell = useUpdateCell();
  const createRow = useCreateRow();
  const deleteRow = useDeleteRow();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const addColumn = useAddColumn();

  // Track cell positions for Tab navigation
  // rowIndex × colIndex — flat list
  const cellPositions = useRef<Array<{ rowId: string; columnId: string }>>([]);

  const startEdit = useCallback(
    (rowId: string, columnId: string) => {
      setEditingCell({ rowId, columnId });
    },
    [],
  );

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const saveCell = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setEditingCell(null);
      updateCell.mutate({ rowId, columnId, value, tableId: table.id });
    },
    [updateCell, table.id],
  );

  function moveFocus(rowId: string, columnId: string, delta: number) {
    const positions = cellPositions.current;
    const idx = positions.findIndex(
      (p) => p.rowId === rowId && p.columnId === columnId,
    );
    if (idx === -1) return;
    const next = positions[idx + delta];
    if (next) setEditingCell({ rowId: next.rowId, columnId: next.columnId });
  }

  // Build TanStack columns
  const tanColumns: TanColumnDef<TableRow>[] = [
    // Row selection checkbox
    columnHelper.display({
      id: '__select__',
      size: 40,
      header: () => (
        <input
          type="checkbox"
          checked={selectedRows.size === rows.length && rows.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRows(new Set(rows.map((r) => r.id)));
            } else {
              setSelectedRows(new Set());
            }
          }}
          className="accent-[var(--color-accent)]"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedRows.has(row.original.id)}
          onChange={(e) => {
            const next = new Set(selectedRows);
            if (e.target.checked) next.add(row.original.id);
            else next.delete(row.original.id);
            setSelectedRows(next);
          }}
          className="accent-[var(--color-accent)]"
        />
      ),
    }),

    // Data columns
    ...table.columns.map((col) =>
      columnHelper.accessor((row) => row.data[col.id], {
        id: col.id,
        size: col.width ?? 150,
        header: () => (
          <ColumnHeader
            column={col}
            sortDirection={
              sorting.find((s) => s.id === col.id)?.desc === false
                ? 'asc'
                : sorting.find((s) => s.id === col.id)?.desc === true
                  ? 'desc'
                  : false
            }
            onSort={() => {
              setSorting((prev) => {
                const existing = prev.find((s) => s.id === col.id);
                if (!existing) return [...prev, { id: col.id, desc: false }];
                if (!existing.desc) return prev.map((s) => s.id === col.id ? { ...s, desc: true } : s);
                return prev.filter((s) => s.id !== col.id);
              });
              // Sync to parent sorts
              const existing = sorting.find((s) => s.id === col.id);
              let newSorts: TableSort[];
              if (!existing) {
                newSorts = [{ columnId: col.id, direction: 'asc' }];
              } else if (!existing.desc) {
                newSorts = [{ columnId: col.id, direction: 'desc' }];
              } else {
                newSorts = [];
              }
              onSortsChange(newSorts);
            }}
            onRename={(name) =>
              updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { name } })
            }
            onDelete={() =>
              deleteColumn.mutate({ tableId: table.id, columnId: col.id })
            }
            onChangeType={(type) =>
              updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { type } })
            }
          />
        ),
        cell: ({ row, getValue }) => {
          const rowId = row.original.id;
          const value = getValue();
          const isEditing =
            editingCell?.rowId === rowId && editingCell?.columnId === col.id;

          // Formula: read-only computed cell
          if (col.type === 'formula') {
            return (
              <FormulaCell
                column={col}
                row={row.original.data}
                allColumns={table.columns}
              />
            );
          }

          // Checkbox: toggle on click, no edit mode
          if (col.type === 'checkbox') {
            return (
              <div
                className="flex items-center justify-center w-full h-full cursor-pointer select-none"
                onClick={() => saveCell(rowId, col.id, !value)}
              >
                <DisplayCell column={col} value={value} />
              </div>
            );
          }

          if (isEditing) {
            return (
              <CellEditor
                column={col}
                value={value}
                onSave={(v) => saveCell(rowId, col.id, v)}
                onCancel={cancelEdit}
                onTabNext={() => moveFocus(rowId, col.id, 1)}
                onTabPrev={() => moveFocus(rowId, col.id, -1)}
              />
            );
          }

          return (
            <div
              className="w-full h-full flex items-center px-2 cursor-text overflow-hidden"
              onClick={() => startEdit(rowId, col.id)}
            >
              <DisplayCell column={col} value={value} />
            </div>
          );
        },
      }),
    ),

    // Row delete action
    columnHelper.display({
      id: '__delete__',
      size: 40,
      header: () => null,
      cell: ({ row }) => (
        <button
          onClick={() => deleteRow.mutate({ id: row.original.id, tableId: table.id })}
          className="opacity-0 group-hover/row:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all p-1"
        >
          <Trash2 size={12} />
        </button>
      ),
    }),
  ] as TanColumnDef<TableRow>[];

  const tanTable = useReactTable({
    data: rows,
    columns: tanColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
  });

  // Build cell positions after each render
  useEffect(() => {
    const positions: Array<{ rowId: string; columnId: string }> = [];
    tanTable.getRowModel().rows.forEach((row) => {
      table.columns.forEach((col) => {
        if (col.type !== 'checkbox' && col.type !== 'formula') {
          positions.push({ rowId: row.original.id, columnId: col.id });
        }
      });
    });
    cellPositions.current = positions;
  });

  // Ignore add-column in the column panel; it's wired up separately via onShowAddColumn

  return (
    <div className="flex-1 overflow-auto relative">
      <table className="w-full border-collapse text-sm table-fixed" style={{ minWidth: `${table.columns.reduce((sum, c) => sum + (c.width ?? 150), 0) + 80 + 40}px` }}>
        {/* Header */}
        <thead className="sticky top-0 z-10">
          {tanTable.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-r border-[var(--color-border)] px-2 py-2 text-left font-medium h-9"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
              {/* Add column button */}
              <th className="w-10 h-9 border-r border-[var(--color-border)]">
                <button
                  onClick={onShowAddColumn}
                  className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  title="Add column"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          ))}
        </thead>

        {/* Body */}
        <tbody>
          {tanTable.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="group/row border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] even:bg-[var(--color-bg-elevated)] transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`border-r border-[var(--color-border)] h-9 relative overflow-hidden ${
                    editingCell?.rowId === row.original.id &&
                    editingCell?.columnId === cell.column.id
                      ? 'outline outline-2 outline-[var(--color-accent)] outline-offset-[-2px]'
                      : ''
                  }`}
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
              {/* Placeholder for add-column header */}
              <td className="w-10 h-9 border-r border-[var(--color-border)]" />
            </tr>
          ))}

          {/* Add row button */}
          <tr className="border-b border-[var(--color-border)]">
            <td colSpan={tanColumns.length + 1}>
              <button
                onClick={() => createRow.mutate({ tableId: table.id })}
                className="flex items-center gap-2 px-3 py-2 w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <Plus size={12} />
                Add row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
