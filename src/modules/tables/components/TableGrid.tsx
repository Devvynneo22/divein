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
import { CellEditor, SelectPill, getSelectColor } from './CellEditor';
import { ColumnHeader } from './ColumnHeader';
import {
  useUpdateCell,
  useCreateRow,
  useDeleteRow,
  useUpdateColumn,
  useDeleteColumn,
} from '../hooks/useTables';

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Column resize hook ─────────────────────────────────────────────────────

function useColumnResize(
  initialWidth: number,
  onResize: (width: number) => void,
) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      function onMouseMove(ev: MouseEvent) {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const newWidth = Math.max(60, startWidth.current + delta);
        setWidth(newWidth);
      }

      function onMouseUp() {
        if (dragging.current) {
          dragging.current = false;
          const finalWidth = Math.max(60, startWidth.current + (startX.current - startX.current));
          void finalWidth; // updated via setWidth
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          // read final width from state in next tick
          setWidth((w) => {
            onResize(w);
            return w;
          });
        }
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [width, onResize],
  );

  return { width, onMouseDown };
}

// ─── ResizableHeader wrapper ────────────────────────────────────────────────

function ResizableHeader({
  column,
  sortDirection,
  onSort,
  onRename,
  onDelete,
  onChangeType,
  onResize,
}: {
  column: ColumnDef;
  sortDirection: 'asc' | 'desc' | false;
  onSort: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onChangeType: (type: import('@/shared/types/table').ColumnType) => void;
  onResize: (width: number) => void;
}) {
  const { width: _w, onMouseDown } = useColumnResize(column.width ?? 150, onResize);

  return (
    <div className="flex items-center w-full h-full relative">
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <ColumnHeader
          column={column}
          sortDirection={sortDirection}
          onSort={onSort}
          onRename={onRename}
          onDelete={onDelete}
          onChangeType={onChangeType}
        />
      </div>
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize flex-shrink-0 group/resize"
        style={{ zIndex: 5 }}
        title="Drag to resize"
      >
        <div
          className="w-full h-full opacity-0 group-hover/resize:opacity-100 transition-opacity"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      </div>
    </div>
  );
}

// ─── Formula cell ──────────────────────────────────────────────────────────────

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
    <div className="w-full h-full flex items-center px-2.5 gap-1.5 select-none">
      <span
        className="text-[9px] font-bold italic leading-none flex-shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
        title={`Formula: ${column.formula}`}
      >
        ƒ
      </span>
      <span
        className="text-xs truncate"
        style={{
          color: isError
            ? 'var(--color-danger)'
            : typeof result === 'boolean'
              ? result
                ? 'var(--color-success)'
                : 'var(--color-text-muted)'
              : 'var(--color-text-primary)',
        }}
      >
        {typeof result === 'boolean' ? (result ? 'TRUE' : 'FALSE') : String(result)}
      </span>
    </div>
  );
}

// ─── Display cell ─────────────────────────────────────────────────────────────

function DisplayCell({ column, value }: { column: ColumnDef; value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return (
      <span className="text-xs italic select-none" style={{ color: 'var(--color-text-muted)' }}>
        —
      </span>
    );
  }

  switch (column.type) {
    case 'checkbox':
      return (
        <div className="flex items-center justify-center w-full h-full">
          <span
            className="text-base leading-none select-none"
            style={{ color: value ? 'var(--color-success)' : 'var(--color-text-muted)' }}
          >
            {value ? '☑' : '☐'}
          </span>
        </div>
      );

    case 'number':
      return (
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {typeof value === 'number' ? value.toLocaleString() : String(value)}
        </span>
      );

    case 'date': {
      const str = String(value);
      try {
        const d = parseISO(str);
        if (isValid(d)) {
          return (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {format(d, 'MMM d, yyyy')}
            </span>
          );
        }
      } catch {
        // fall through
      }
      return (
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {str}
        </span>
      );
    }

    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {arr.map((tag) => {
            const colors = getSelectColor(tag);
            return (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      );
    }

    case 'select':
      return <SelectPill value={String(value)} />;

    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs truncate underline"
          style={{ color: 'var(--color-accent)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );

    case 'email':
      return (
        <span className="text-xs truncate" style={{ color: 'var(--color-accent)' }}>
          {String(value)}
        </span>
      );

    default:
      return (
        <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)' }}>
          {String(value)}
        </span>
      );
  }
}

// ─── Main component ──────────────────────────────────────────────────────────

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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    for (const col of table.columns) {
      widths[col.id] = col.width ?? 150;
    }
    return widths;
  });

  const updateCell = useUpdateCell();
  const createRow = useCreateRow();
  const deleteRow = useDeleteRow();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();

  const cellPositions = useRef<Array<{ rowId: string; columnId: string }>>([]);

  const startEdit = useCallback((rowId: string, columnId: string) => {
    setEditingCell({ rowId, columnId });
  }, []);

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
    const idx = positions.findIndex((p) => p.rowId === rowId && p.columnId === columnId);
    if (idx === -1) return;
    const next = positions[idx + delta];
    if (next) setEditingCell({ rowId: next.rowId, columnId: next.columnId });
  }

  // Sync column widths when table.columns changes
  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev };
      for (const col of table.columns) {
        if (!(col.id in next)) next[col.id] = col.width ?? 150;
      }
      return next;
    });
  }, [table.columns]);

  // Build TanStack columns
  const tanColumns: TanColumnDef<TableRow>[] = [
    // Row number column
    columnHelper.display({
      id: '__rownum__',
      size: 48,
      header: () => (
        <div className="flex items-center justify-center w-full">
          <input
            type="checkbox"
            checked={selectedRows.size === rows.length && rows.length > 0}
            onChange={(e) => {
              if (e.target.checked) setSelectedRows(new Set(rows.map((r) => r.id)));
              else setSelectedRows(new Set());
            }}
            className="accent-[var(--color-accent)]"
          />
        </div>
      ),
      cell: ({ row }) => {
        const isSelected = selectedRows.has(row.original.id);
        return (
          <div
            className="flex items-center justify-center gap-1.5 w-full h-full group/rownum"
          >
            {/* Show checkbox on hover/selected, row number otherwise */}
            <div className="relative w-5 h-5 flex items-center justify-center">
              <span
                className="absolute text-[11px] transition-opacity group-hover/rownum:opacity-0"
                style={{
                  color: 'var(--color-text-muted)',
                  opacity: isSelected ? 0 : 1,
                }}
              >
                {row.index + 1}
              </span>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  const next = new Set(selectedRows);
                  if (e.target.checked) next.add(row.original.id);
                  else next.delete(row.original.id);
                  setSelectedRows(next);
                }}
                className="accent-[var(--color-accent)] absolute opacity-0 group-hover/rownum:opacity-100 transition-opacity"
                style={{ opacity: isSelected ? 1 : undefined }}
              />
            </div>
          </div>
        );
      },
    }),

    // Data columns
    ...table.columns.map((col) =>
      columnHelper.accessor((row) => row.data[col.id], {
        id: col.id,
        size: columnWidths[col.id] ?? col.width ?? 150,
        header: () => (
          <ResizableHeader
            column={{ ...col, width: columnWidths[col.id] ?? col.width ?? 150 }}
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
              const existing = sorting.find((s) => s.id === col.id);
              let newSorts: TableSort[];
              if (!existing) newSorts = [{ columnId: col.id, direction: 'asc' }];
              else if (!existing.desc) newSorts = [{ columnId: col.id, direction: 'desc' }];
              else newSorts = [];
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
            onResize={(width) => {
              setColumnWidths((prev) => ({ ...prev, [col.id]: width }));
              updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { width } });
            }}
          />
        ),
        cell: ({ row, getValue }) => {
          const rowId = row.original.id;
          const value = getValue();
          const isEditing =
            editingCell?.rowId === rowId && editingCell?.columnId === col.id;

          if (col.type === 'formula') {
            return (
              <FormulaCell column={col} row={row.original.data} allColumns={table.columns} />
            );
          }

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

          const isNumber = col.type === 'number';
          return (
            <div
              className="w-full h-full flex items-center px-2.5 cursor-text overflow-hidden"
              style={{ justifyContent: isNumber ? 'flex-end' : undefined }}
              onClick={() => startEdit(rowId, col.id)}
            >
              <DisplayCell column={col} value={value} />
            </div>
          );
        },
      }),
    ),

    // Delete action column
    columnHelper.display({
      id: '__delete__',
      size: 36,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-center w-full h-full opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => deleteRow.mutate({ id: row.original.id, tableId: table.id })}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-danger)';
              e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
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
    columnResizeMode: 'onChange',
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

  const totalWidth =
    48 + // row num
    36 + // delete
    table.columns.reduce((sum, c) => sum + (columnWidths[c.id] ?? c.width ?? 150), 0) +
    36; // add column btn

  return (
    <div className="flex-1 overflow-auto relative" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table
        className="border-collapse text-sm"
        style={{
          width: `${totalWidth}px`,
          minWidth: '100%',
          tableLayout: 'fixed',
        }}
      >
        {/* colgroup for precise widths */}
        <colgroup>
          <col style={{ width: '48px' }} />
          {table.columns.map((col) => (
            <col key={col.id} style={{ width: `${columnWidths[col.id] ?? col.width ?? 150}px` }} />
          ))}
          <col style={{ width: '36px' }} />
          <col style={{ width: '36px' }} />
        </colgroup>

        {/* Sticky header */}
        <thead className="sticky top-0 z-20">
          {tanTable.getHeaderGroups().map((hg) => (
            <tr
              key={hg.id}
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderBottom: '2px solid var(--color-border)',
              }}
            >
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-2 py-2 text-left h-9 overflow-hidden"
                  style={{
                    borderRight: '1px solid var(--color-border)',
                    width: header.getSize(),
                    fontWeight: 600,
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
              {/* Add column header button */}
              <th
                className="h-9"
                style={{
                  width: '36px',
                  borderRight: '1px solid var(--color-border)',
                }}
              >
                <button
                  onClick={onShowAddColumn}
                  className="w-full h-full flex items-center justify-center transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-accent)';
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
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
          {tanTable.getRowModel().rows.map((row, rowIndex) => {
            const isSelected = selectedRows.has(row.original.id);
            return (
              <tr
                key={row.id}
                className="group/row transition-colors"
                style={{
                  backgroundColor: isSelected
                    ? 'var(--color-accent-soft)'
                    : rowIndex % 2 === 0
                      ? 'transparent'
                      : 'transparent',
                  borderBottom: '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const isEditingThis =
                    editingCell?.rowId === row.original.id &&
                    editingCell?.columnId === cell.column.id;
                  return (
                    <td
                      key={cell.id}
                      className="relative overflow-hidden h-9"
                      style={{
                        borderRight: '1px solid var(--color-border)',
                        width: cell.column.getSize(),
                        outline: isEditingThis
                          ? '2px solid var(--color-accent)'
                          : 'none',
                        outlineOffset: isEditingThis ? '-2px' : undefined,
                        backgroundColor: isEditingThis ? 'var(--color-accent-soft)' : undefined,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
                {/* Placeholder for add-column */}
                <td
                  className="h-9"
                  style={{ borderRight: '1px solid var(--color-border)', width: '36px' }}
                />
              </tr>
            );
          })}

          {/* Empty state */}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={tanColumns.length + 1}
                className="py-12 text-center"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span className="text-2xl block mb-2">📋</span>
                <span className="text-sm">No rows yet — add one below</span>
              </td>
            </tr>
          )}

          {/* Add row */}
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td colSpan={tanColumns.length + 1}>
              <button
                onClick={() => createRow.mutate({ tableId: table.id })}
                className="flex items-center gap-2 px-4 py-2.5 w-full text-xs font-medium transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Plus size={13} />
                Add row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
