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
import { Plus, Trash2, Copy } from 'lucide-react';
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
  useAddColumn,
} from '../hooks/useTables';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CellPos {
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

interface RowContextMenu {
  x: number;
  y: number;
  rowId: string;
  rowData: Record<string, unknown>;
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
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
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
  onDuplicate,
}: {
  column: ColumnDef;
  sortDirection: 'asc' | 'desc' | false;
  onSort: (direction?: 'asc' | 'desc') => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onChangeType: (type: import('@/shared/types/table').ColumnType) => void;
  onResize: (width: number) => void;
  onDuplicate: () => void;
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
          onDuplicate={onDuplicate}
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
    <div
      className="w-full h-full flex items-center px-2.5 gap-1.5 select-none"
      style={{ backgroundColor: 'var(--color-bg-wash)' }}
      title={`Formula: ${column.formula}`}
    >
      <span
        className="text-[9px] font-bold italic leading-none flex-shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ƒ
      </span>
      <span
        className="text-xs truncate italic"
        style={{
          color: isError
            ? 'var(--color-danger)'
            : typeof result === 'boolean'
              ? result
                ? 'var(--color-success)'
                : 'var(--color-text-muted)'
              : 'var(--color-text-secondary)',
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
    if (column.type === 'checkbox') {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <span className="text-base leading-none select-none" style={{ color: 'var(--color-text-muted)' }}>
            ☐
          </span>
        </div>
      );
    }
    return (
      <span className="text-xs italic select-none" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>
        —
      </span>
    );
  }

  switch (column.type) {
    case 'checkbox':
      return (
        <div className="flex items-center justify-center w-full h-full">
          <span
            className="text-base leading-none select-none transition-all"
            style={{ color: value ? 'var(--color-success)' : 'var(--color-text-muted)' }}
          >
            {value ? '☑' : '☐'}
          </span>
        </div>
      );

    case 'number':
      return (
        <span
          className="text-xs tabular-nums w-full block text-right pr-0.5"
          style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
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
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {str}
        </span>
      );
    }

    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1 overflow-hidden">
          {arr.map((tag) => {
            const colors = getSelectColor(tag);
            return (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
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

// ─── Row Context Menu ─────────────────────────────────────────────────────────

function RowContextMenuEl({
  menu,
  onClose,
  onDuplicate,
  onDelete,
}: {
  menu: RowContextMenu;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: menu.x,
    top: menu.y,
    zIndex: 9999,
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    boxShadow: 'var(--shadow-popup, 0 8px 24px rgba(0,0,0,0.15))',
    padding: '4px',
    minWidth: '160px',
  };

  const itemBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    transition: 'background-color 0.1s, color 0.1s',
    textAlign: 'left' as const,
  };

  return (
    <div ref={ref} style={menuStyle}>
      <button
        style={itemBase}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        onClick={() => { onDuplicate(); onClose(); }}
      >
        <Copy size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        Duplicate row
      </button>

      <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />

      <button
        style={{ ...itemBase, color: 'var(--color-danger)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onClick={() => { onDelete(); onClose(); }}
      >
        <Trash2 size={13} style={{ flexShrink: 0 }} />
        Delete row
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<TableRow>();

export function TableGrid({
  table,
  rows,
  onSortsChange,
  onShowAddColumn,
}: TableGridProps) {
  const [editingCell, setEditingCell] = useState<CellPos | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellPos | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {};
    for (const col of table.columns) {
      widths[col.id] = col.width ?? 150;
    }
    return widths;
  });
  const [rowContextMenu, setRowContextMenu] = useState<RowContextMenu | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const cellPositions = useRef<CellPos[]>([]);

  const updateCell = useUpdateCell();
  const createRow = useCreateRow();
  const deleteRow = useDeleteRow();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const addColumn = useAddColumn();

  // ── Cell interaction ────────────────────────────────────────────────────

  const startEdit = useCallback((rowId: string, columnId: string) => {
    setSelectedCell({ rowId, columnId });
    setEditingCell({ rowId, columnId });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    // Keep selection so user can navigate with arrows after Escape
    setTimeout(() => gridRef.current?.focus(), 0);
  }, []);

  const saveCell = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      setEditingCell(null);
      updateCell.mutate({ rowId, columnId, value, tableId: table.id });
      setTimeout(() => gridRef.current?.focus(), 0);
    },
    [updateCell, table.id],
  );

  function moveFocus(rowId: string, columnId: string, delta: number) {
    const positions = cellPositions.current;
    const idx = positions.findIndex((p) => p.rowId === rowId && p.columnId === columnId);
    if (idx === -1) return;
    const next = positions[idx + delta];
    if (next) {
      setSelectedCell({ rowId: next.rowId, columnId: next.columnId });
      setEditingCell({ rowId: next.rowId, columnId: next.columnId });
    }
  }

  // ── Grid keyboard navigation ────────────────────────────────────────────

  function handleGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (editingCell) return; // editor handles its own keys
    if (!selectedCell) return;

    const { rowId, columnId } = selectedCell;
    const tableRows = tanTable.getRowModel().rows;
    const rowIndex = tableRows.findIndex((r) => r.original.id === rowId);
    const colIndex = table.columns.findIndex((c) => c.id === columnId);

    switch (e.key) {
      case 'Enter': {
        e.preventDefault();
        const col = table.columns.find((c) => c.id === columnId);
        if (col && col.type !== 'formula') {
          if (col.type === 'checkbox') {
            const row = tableRows[rowIndex]?.original;
            if (row) {
              const val = row.data[columnId];
              saveCell(rowId, columnId, !val);
            }
          } else {
            startEdit(rowId, columnId);
          }
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        setSelectedCell(null);
        break;
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        const col = table.columns.find((c) => c.id === columnId);
        if (col && col.type !== 'formula') {
          updateCell.mutate({ rowId, columnId, value: null, tableId: table.id });
        }
        break;
      }
      case 'Tab': {
        e.preventDefault();
        const positions = cellPositions.current;
        const idx = positions.findIndex((p) => p.rowId === rowId && p.columnId === columnId);
        const next = positions[idx + (e.shiftKey ? -1 : 1)];
        if (next) setSelectedCell({ rowId: next.rowId, columnId: next.columnId });
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (colIndex < table.columns.length - 1) {
          const nextCol = table.columns[colIndex + 1];
          setSelectedCell({ rowId, columnId: nextCol.id });
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (colIndex > 0) {
          const prevCol = table.columns[colIndex - 1];
          setSelectedCell({ rowId, columnId: prevCol.id });
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (rowIndex < tableRows.length - 1) {
          setSelectedCell({ rowId: tableRows[rowIndex + 1].original.id, columnId });
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (rowIndex > 0) {
          setSelectedCell({ rowId: tableRows[rowIndex - 1].original.id, columnId });
        }
        break;
      }
    }
  }

  // Deselect when clicking outside the grid
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setSelectedCell(null);
        setEditingCell(null);
        setRowContextMenu(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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

  // ── Sort helpers ─────────────────────────────────────────────────────────

  function applySort(colId: string, direction?: 'asc' | 'desc') {
    if (direction) {
      const desc = direction === 'desc';
      setSorting((prev) => {
        const existing = prev.find((s) => s.id === colId);
        if (existing) return prev.map((s) => (s.id === colId ? { ...s, desc } : s));
        return [...prev, { id: colId, desc }];
      });
      onSortsChange([{ columnId: colId, direction }]);
    } else {
      // Toggle: none → asc → desc → none
      setSorting((prev) => {
        const existing = prev.find((s) => s.id === colId);
        if (!existing) return [...prev, { id: colId, desc: false }];
        if (!existing.desc) return prev.map((s) => (s.id === colId ? { ...s, desc: true } : s));
        return prev.filter((s) => s.id !== colId);
      });
      const existing = sorting.find((s) => s.id === colId);
      let newSorts: TableSort[];
      if (!existing) newSorts = [{ columnId: colId, direction: 'asc' }];
      else if (!existing.desc) newSorts = [{ columnId: colId, direction: 'desc' }];
      else newSorts = [];
      onSortsChange(newSorts);
    }
  }

  // ── Build TanStack columns ────────────────────────────────────────────────

  const tanColumns: TanColumnDef<TableRow>[] = [
    // Row number column
    columnHelper.display({
      id: '__rownum__',
      size: 44,
      header: () => (
        <div className="flex items-center justify-center w-full">
          <input
            type="checkbox"
            checked={selectedRows.size === rows.length && rows.length > 0}
            onChange={(e) => {
              if (e.target.checked) setSelectedRows(new Set(rows.map((r) => r.id)));
              else setSelectedRows(new Set());
            }}
            style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
          />
        </div>
      ),
      cell: ({ row }) => {
        const isSelected = selectedRows.has(row.original.id);
        return (
          <div className="flex items-center justify-center gap-1.5 w-full h-full group/rownum">
            <div className="relative w-5 h-5 flex items-center justify-center">
              <span
                className="absolute text-[11px] transition-opacity group-hover/rownum:opacity-0"
                style={{
                  color: 'var(--color-text-muted)',
                  opacity: isSelected ? 0 : 1,
                  userSelect: 'none',
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
                className="absolute transition-opacity"
                style={{
                  opacity: isSelected ? 1 : 0,
                  accentColor: 'var(--color-accent)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLInputElement).style.opacity = '1'; }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLInputElement).style.opacity = '0';
                }}
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
            onSort={(dir) => applySort(col.id, dir)}
            onRename={(name) =>
              updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { name } })
            }
            onDelete={() => deleteColumn.mutate({ tableId: table.id, columnId: col.id })}
            onChangeType={(type) =>
              updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { type } })
            }
            onResize={(width) => {
              setColumnWidths((prev) => ({ ...prev, [col.id]: width }));
              updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { width } });
            }}
            onDuplicate={() => {
              const newCol = {
                ...col,
                id: crypto.randomUUID(),
                name: `${col.name} (copy)`,
              };
              addColumn.mutate({ tableId: table.id, column: newCol });
            }}
          />
        ),
        cell: ({ row, getValue }) => {
          const rowId = row.original.id;
          const value = getValue();
          const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === col.id;
          const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === col.id;

          if (col.type === 'formula') {
            return <FormulaCell column={col} row={row.original.data} allColumns={table.columns} />;
          }

          if (col.type === 'checkbox') {
            return (
              <div
                className="flex items-center justify-center w-full h-full cursor-pointer select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  saveCell(rowId, col.id, !value);
                }}
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
          const isAlreadySelected = isSelected && !isEditing;

          return (
            <div
              className="w-full h-full flex items-center px-2.5 cursor-text overflow-hidden"
              style={{
                justifyContent: isNumber ? 'flex-end' : undefined,
                paddingTop: '5px',
                paddingBottom: '5px',
              }}
              onClick={() => {
                if (isAlreadySelected) {
                  // Second click → start editing
                  startEdit(rowId, col.id);
                } else {
                  // First click → select
                  setSelectedCell({ rowId, columnId: col.id });
                  gridRef.current?.focus();
                }
              }}
              onDoubleClick={() => startEdit(rowId, col.id)}
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
            onClick={(e) => {
              e.stopPropagation();
              deleteRow.mutate({ id: row.original.id, tableId: table.id });
            }}
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
    const positions: CellPos[] = [];
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
    44 + // row num
    36 + // delete
    36 + // add col
    table.columns.reduce((sum, c) => sum + (columnWidths[c.id] ?? c.width ?? 150), 0);

  return (
    <div
      ref={gridRef}
      className="flex-1 overflow-auto relative"
      style={{ WebkitOverflowScrolling: 'touch', outline: 'none' }}
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
    >
      <table
        className="border-collapse"
        style={{
          width: `${totalWidth}px`,
          minWidth: '100%',
          tableLayout: 'fixed',
          fontSize: '13px',
        }}
      >
        {/* colgroup for precise widths */}
        <colgroup>
          <col style={{ width: '44px' }} />
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
                  className="px-2 py-0 text-left overflow-hidden"
                  style={{
                    borderRight: '1px solid var(--color-border)',
                    width: header.getSize(),
                    fontWeight: 600,
                    height: '36px',
                    fontSize: '13px',
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
              {/* Add column header button */}
              <th
                style={{
                  width: '36px',
                  borderRight: '1px solid var(--color-border)',
                  height: '36px',
                }}
              >
                <button
                  onClick={onShowAddColumn}
                  className="w-full h-full flex items-center justify-center transition-colors"
                  style={{ color: 'var(--color-text-muted)', height: '36px' }}
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
            const isRowSelected = selectedRows.has(row.original.id);
            const isOdd = rowIndex % 2 !== 0;

            // Row background: selected rows > alternating > transparent
            let rowBg = isOdd ? 'var(--color-bg-wash)' : 'transparent';
            if (isRowSelected) rowBg = 'var(--color-accent-soft)';

            return (
              <tr
                key={row.id}
                className="group/row"
                style={{
                  backgroundColor: rowBg,
                  borderBottom: '1px solid var(--color-border)',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isRowSelected)
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isRowSelected)
                    e.currentTarget.style.backgroundColor = rowBg;
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setRowContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    rowId: row.original.id,
                    rowData: row.original.data,
                  });
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const isEditingThis =
                    editingCell?.rowId === row.original.id &&
                    editingCell?.columnId === cell.column.id;
                  const isSelectedThis =
                    selectedCell?.rowId === row.original.id &&
                    selectedCell?.columnId === cell.column.id;

                  let cellBg: string | undefined;
                  if (isEditingThis) cellBg = 'var(--color-bg-elevated)';
                  else if (cell.column.id !== '__rownum__' && cell.column.id !== '__delete__') {
                    const colDef = table.columns.find((c) => c.id === cell.column.id);
                    if (colDef?.type === 'formula') cellBg = 'var(--color-bg-wash)';
                  }

                  return (
                    <td
                      key={cell.id}
                      className="relative overflow-hidden"
                      style={{
                        borderRight: '1px solid var(--color-border)',
                        width: cell.column.getSize(),
                        height: '36px',
                        backgroundColor: cellBg,
                        // Selected cell: 2px inset accent border
                        outline:
                          isSelectedThis
                            ? '2px solid var(--color-accent)'
                            : 'none',
                        outlineOffset: isSelectedThis ? '-2px' : undefined,
                        position: 'relative',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
                {/* Placeholder for add-column */}
                <td
                  style={{
                    borderRight: '1px solid var(--color-border)',
                    width: '36px',
                    height: '36px',
                  }}
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
                className="flex items-center gap-2 px-3 py-2.5 w-full transition-colors"
                style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 500 }}
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
                New row
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Row Context Menu */}
      {rowContextMenu && (
        <RowContextMenuEl
          menu={rowContextMenu}
          onClose={() => setRowContextMenu(null)}
          onDuplicate={() => {
            createRow.mutate({ tableId: table.id, data: rowContextMenu.rowData });
          }}
          onDelete={() => {
            deleteRow.mutate({ id: rowContextMenu.rowId, tableId: table.id });
          }}
        />
      )}
    </div>
  );
}
