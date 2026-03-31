import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  KeyboardEvent,
} from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef as TanColumnDef,
} from '@tanstack/react-table';
import { Plus, Trash2, Copy, Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import type {
  TableDef,
  TableRow,
  TableFilter,
  TableSort,
  ColumnDef,
  ColumnType,
} from '@/shared/types/table';
import { evaluateFormula } from '@/shared/lib/formulaEngine';
import {
  CellEditor,
  SelectPill,
  getSelectColor,
  RatingDisplay,
  ProgressDisplay,
} from './CellEditor';
import { ColumnHeader } from './ColumnHeader';
import {
  useUpdateCell,
  useCreateRow,
  useDeleteRow,
  useUpdateColumn,
  useDeleteColumn,
  useAddColumn,
} from '../hooks/useTables';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface TableGridProps {
  table: TableDef;
  rows: TableRow[];
  filters: TableFilter[];
  sorts: TableSort[];
  onSortsChange: (sorts: TableSort[]) => void;
  onShowAddColumn: () => void;
}

type AggregationType = 'none' | 'count' | 'sum' | 'average' | 'min' | 'max';

interface CellCoord {
  rowIndex: number;
  colIndex: number;
}

interface ContextMenu {
  x: number;
  y: number;
  rowId: string;
}

// â”€â”€â”€ useColumnResize Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useColumnResize(
  initialWidths: Record<string, number>,
  onWidthChange?: (colId: string, width: number) => void,
) {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const dragging = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback(
    (colId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = {
        colId,
        startX: e.clientX,
        startWidth: widths[colId] ?? 160,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - dragging.current.startX;
        const newWidth = Math.max(60, dragging.current.startWidth + delta);
        setWidths((prev) => ({ ...prev, [dragging.current!.colId]: newWidth }));
      };

      const onUp = () => {
        if (dragging.current) {
          const finalWidth = widths[dragging.current.colId] ?? 160;
          onWidthChange?.(dragging.current.colId, finalWidth);
        }
        dragging.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [widths, onWidthChange],
  );

  return { widths, setWidths, startResize };
}

// â”€â”€â”€ FormulaCell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FormulaCell({
  formula,
  rowData,
  columns,
}: {
  formula: string;
  rowData: Record<string, unknown>;
  columns: ColumnDef[];
}) {
  const result = useMemo(() => {
    try {
      return evaluateFormula(formula, rowData, columns);
    } catch {
      return '#ERR';
    }
  }, [formula, rowData, columns]);

  return (
    <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
      {String(result ?? '')}
    </span>
  );
}

// â”€â”€â”€ DisplayCell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DisplayCell({
  value,
  type,
  options,
  formula,
  rowData,
  columns,
}: {
  value: unknown;
  type: ColumnType;
  options?: string[];
  formula?: string;
  rowData: Record<string, unknown>;
  columns: ColumnDef[];
}) {
  switch (type) {
    case 'text':
    case 'email':
      return <span className="truncate">{String(value ?? '')}</span>;

    case 'url':
      return value ? (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-blue-400 underline hover:text-blue-300"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      ) : null;

    case 'number': {
      const num = Number(value);
      if (value === null || value === undefined || value === '') return null;
      return (
        <span style={{ color: num < 0 ? 'var(--color-error, #f87171)' : undefined }}>
          {num.toLocaleString()}
        </span>
      );
    }

    case 'date': {
      if (!value) return null;
      try {
        const parsed = typeof value === 'string' ? parseISO(value) : new Date(value as string);
        if (!isValid(parsed)) return <span className="text-red-400">Invalid</span>;
        return <span>{format(parsed, 'MMM d, yyyy')}</span>;
      } catch {
        return <span className="text-red-400">Invalid</span>;
      }
    }

    case 'checkbox':
      return (
        <div className="flex items-center justify-center">
          <input type="checkbox" checked={Boolean(value)} readOnly className="pointer-events-none" />
        </div>
      );

    case 'select':
      return value ? (
        <SelectPill value={String(value)} />
      ) : null;

    case 'multiselect': {
      const vals = Array.isArray(value) ? value : value ? [value] : [];
      return (
        <div className="flex flex-wrap gap-1">
          {vals.map((v, i) => (
            <SelectPill
              key={i}
              value={String(v)}
            />
          ))}
        </div>
      );
    }

    case 'formula':
      return (
        <FormulaCell formula={formula ?? ''} rowData={rowData} columns={columns} />
      );

    case 'rating':
      return <RatingDisplay value={value as number} />;

    case 'progress':
      return <ProgressDisplay value={value as number} />;

    default:
      return <span className="truncate">{String(value ?? '')}</span>;
  }
}

// â”€â”€â”€ getCellCondStyle â€” Conditional Cell Coloring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getCellCondStyle(
  value: unknown,
  type: ColumnType,
): React.CSSProperties {
  switch (type) {
    case 'date': {
      if (!value) return {};
      try {
        const parsed = typeof value === 'string' ? parseISO(value) : new Date(value as string);
        if (isValid(parsed) && parsed < new Date()) {
          return { backgroundColor: 'rgba(248,113,113,0.12)' };
        }
      } catch { /* ignore */ }
      return {};
    }
    case 'checkbox':
      return Boolean(value) ? { backgroundColor: 'rgba(74,222,128,0.12)' } : {};
    case 'number': {
      const num = Number(value);
      if (value !== null && value !== undefined && value !== '' && num < 0) {
        return { backgroundColor: 'rgba(248,113,113,0.08)' };
      }
      return {};
    }
    case 'rating':
      return Number(value) === 5 ? { backgroundColor: 'rgba(251,191,36,0.15)' } : {};
    case 'progress':
      return Number(value) === 100 ? { backgroundColor: 'rgba(74,222,128,0.12)' } : {};
    default:
      return {};
  }
}

// â”€â”€â”€ computeAggregation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function computeAggregation(
  agg: AggregationType,
  values: unknown[],
): string {
  if (agg === 'none') return '';
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (agg === 'count') return String(nonNull.length);
  const nums = nonNull.map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return agg === 'sum' || agg === 'average' ? '0' : '';
  switch (agg) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0).toLocaleString();
    case 'average': {
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return avg % 1 === 0 ? String(avg) : avg.toFixed(2);
    }
    case 'min':
      return String(Math.min(...nums));
    case 'max':
      return String(Math.max(...nums));
    default:
      return '';
  }
}

// â”€â”€â”€ ResizableHeader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResizableHeader({
  col,
  table,
  sorts,
  onSortsChange,
  onWidthChange,
  startResize,
  width,
}: {
  col: ColumnDef;
  table: TableDef;
  sorts: TableSort[];
  onSortsChange: (s: TableSort[]) => void;
  onWidthChange: (colId: string, w: number) => void;
  startResize: (colId: string, e: React.MouseEvent) => void;
  width: number;
}) {
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();

  const sortDir = sorts.find(s => s.columnId === col.id);
  const sortDirection: 'asc' | 'desc' | false = sortDir ? sortDir.direction : false;

  return (
    <th
      className="relative select-none border-b border-r"
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        backgroundColor: 'var(--color-surface-raised, #1e1e2e)',
        borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
        padding: 0,
      }}
    >
      <ColumnHeader
        column={col}
        sortDirection={sortDirection}
        onSort={(dir) => {
          if (dir) onSortsChange([{ columnId: col.id, direction: dir }]);
          else {
            if (!sortDir) onSortsChange([{ columnId: col.id, direction: 'asc' }]);
            else if (sortDir.direction === 'asc') onSortsChange([{ columnId: col.id, direction: 'desc' }]);
            else onSortsChange([]);
          }
        }}
        onRename={(name) => updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { name } })}
        onDelete={() => deleteColumn.mutate({ tableId: table.id, columnId: col.id })}
        onChangeType={(type) => updateColumn.mutate({ tableId: table.id, columnId: col.id, updates: { type } })}
      />
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => startResize(col.id, e)}
        style={{ zIndex: 10 }}
      />
    </th>
  );
}

// â”€â”€â”€ RowContextMenuEl â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RowContextMenuEl({
  menu,
  onDuplicate,
  onDelete,
  onClose,
}: {
  menu: ContextMenu;
  onDuplicate: (rowId: string) => void;
  onDelete: (rowId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded shadow-lg border text-sm"
      style={{
        top: menu.y,
        left: menu.x,
        backgroundColor: 'var(--color-surface-raised, #1e1e2e)',
        borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
        minWidth: 160,
      }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-white/5 text-left"
        onClick={() => { onDuplicate(menu.rowId); onClose(); }}
      >
        <Copy size={14} /> Duplicate row
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-400 text-left"
        onClick={() => { onDelete(menu.rowId); onClose(); }}
      >
        <Trash2 size={14} /> Delete row
      </button>
    </div>
  );
}

// â”€â”€â”€ AggregationDropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AggregationDropdown({
  colType,
  value,
  onChange,
  result,
}: {
  colType: ColumnType;
  value: AggregationType;
  onChange: (v: AggregationType) => void;
  result: string;
}) {
  const [open, setOpen] = useState(false);
  const isNumeric = colType === 'number' || colType === 'rating' || colType === 'progress';
  const options: AggregationType[] = isNumeric
    ? ['none', 'count', 'sum', 'average', 'min', 'max']
    : ['none', 'count'];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full h-full">
      <button
        className="flex w-full h-full items-center justify-between px-2 py-1 text-xs hover:bg-white/5 rounded gap-1"
        onClick={() => setOpen((p) => !p)}
        style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.4))' }}
      >
        <span className="truncate">
          {value !== 'none' ? (
            <>
              <span className="opacity-60 capitalize">{value}: </span>
              <span style={{ color: 'var(--color-text, white)' }}>{result}</span>
            </>
          ) : (
            <span className="opacity-40">â€”</span>
          )}
        </span>
        <ChevronDown size={10} className="shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 z-50 rounded shadow-lg border text-xs"
          style={{
            backgroundColor: 'var(--color-surface-raised, #1e1e2e)',
            borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
            minWidth: 120,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              className={`flex w-full items-center px-3 py-1.5 hover:bg-white/5 capitalize ${value === opt ? 'text-blue-400' : ''}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt === 'none' ? 'No aggregation' : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function TableGrid({
  table,
  rows,
  filters,
  sorts,
  onSortsChange,
  onShowAddColumn,
}: TableGridProps) {
  const updateCell = useUpdateCell();
  const createRow = useCreateRow();
  const deleteRow = useDeleteRow();

  // â”€â”€ Column widths
  const defaultWidths = useMemo(() => {
    const w: Record<string, number> = { __checkbox: 40, __rownum: 48 };
    table.columns.forEach((c) => { w[c.id] = c.width ?? 160; });
    return w;
  }, [table.columns]);

  const { widths, startResize } = useColumnResize(defaultWidths);

  // â”€â”€ Selection state
  const [selectedCell, setSelectedCell] = useState<CellCoord | null>(null);
  const [editingCell, setEditingCell] = useState<CellCoord | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // â”€â”€ Aggregation state
  const [aggregations, setAggregations] = useState<Record<string, AggregationType>>(() => {
    const init: Record<string, AggregationType> = {};
    table.columns.forEach((c) => { init[c.id] = 'none'; });
    return init;
  });

  // â”€â”€ Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // â”€â”€ Quick-add state
  const [quickAddValue, setQuickAddValue] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);

  // â”€â”€ Sorting (tanstack)
  const [sorting, setSorting] = useState<SortingState>([]);

  // â”€â”€ Filtered rows (apply filters)
  const filteredRows = useMemo(() => {
    if (!filters || filters.length === 0) return rows;
    return rows.filter((row) => {
      return filters.every((f) => {
        const val = row.data[f.columnId];
        const strVal = String(val ?? '').toLowerCase();
        const strFilter = String(f.value ?? '').toLowerCase();
        switch (f.operator) {
          case 'contains': return strVal.includes(strFilter);
          case 'eq': return strVal === strFilter;
          case 'neq': return strVal !== strFilter;
          case 'empty': return !val && val !== 0;
          case 'notEmpty': return !!val || val === 0;
          case 'gt': return Number(val) > Number(f.value);
          case 'gte': return Number(val) >= Number(f.value);
          case 'lt': return Number(val) < Number(f.value);
          case 'lte': return Number(val) <= Number(f.value);
          default: return true;
        }
      });
    });
  }, [rows, filters]);

  // â”€â”€ Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: CellCoord[] = [];
    filteredRows.forEach((row, rIdx) => {
      table.columns.forEach((col, cIdx) => {
        const val = String(row.data[col.id] ?? '').toLowerCase();
        if (val.includes(q)) {
          matches.push({ rowIndex: rIdx, colIndex: cIdx });
        }
      });
    });
    return matches;
  }, [searchQuery, filteredRows, table.columns]);

  const currentMatch = searchMatches[searchMatchIndex] ?? null;

  // â”€â”€ Navigate search
  const goNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    setSearchMatchIndex((i) => (i + 1) % searchMatches.length);
  }, [searchMatches.length]);

  const goPrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    setSearchMatchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length);
  }, [searchMatches.length]);

  // â”€â”€ Handle Ctrl+F
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // â”€â”€ TanStack columns
  const tanColumns = useMemo<TanColumnDef<TableRow>[]>(() => {
    return table.columns.map((col) => ({
      id: col.id,
      accessorFn: (row) => row.data[col.id],
      header: col.name,
      size: widths[col.id] ?? 160,
    }));
  }, [table.columns, widths]);

  const tanTable = useReactTable({
    data: filteredRows,
    columns: tanColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableRows = tanTable.getRowModel().rows;

  // â”€â”€ First text column for quick-add
  const firstTextCol = useMemo(
    () => table.columns.find((c) => c.type === 'text'),
    [table.columns],
  );

  // â”€â”€ Handlers
  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowIndex, colIndex });
    setEditingCell(null);
  };

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    const col = table.columns[colIndex];
    if (col?.type === 'formula') return;
    setSelectedCell({ rowIndex, colIndex });
    setEditingCell({ rowIndex, colIndex });
  };

  const handleCellSave = useCallback(
    (rowId: string, colId: string, value: unknown) => {
      updateCell.mutate({ rowId, columnId: colId, value, tableId: table.id });
      setEditingCell(null);
    },
    [updateCell],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (searchOpen) return;
      if (!selectedCell) return;
      const { rowIndex, colIndex } = selectedCell;
      const maxRow = tableRows.length - 1;
      const maxCol = table.columns.length - 1;

      if (editingCell) {
        if (e.key === 'Escape') {
          setEditingCell(null);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'Enter':
        case 'F2': {
          const col = table.columns[colIndex];
          if (col && col.type !== 'formula') {
            setEditingCell({ rowIndex, colIndex });
          }
          e.preventDefault();
          break;
        }
        case 'Escape':
          setSelectedCell(null);
          e.preventDefault();
          break;
        case 'Delete':
        case 'Backspace': {
          const row = tableRows[rowIndex];
          const col = table.columns[colIndex];
          if (row && col && col.type !== 'formula') {
            handleCellSave(row.original.id, col.id, null);
          }
          e.preventDefault();
          break;
        }
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedCell({ rowIndex, colIndex: Math.max(0, colIndex - 1) });
          } else {
            setSelectedCell({ rowIndex, colIndex: Math.min(maxCol, colIndex + 1) });
          }
          break;
        case 'ArrowUp':
          setSelectedCell({ rowIndex: Math.max(0, rowIndex - 1), colIndex });
          e.preventDefault();
          break;
        case 'ArrowDown':
          setSelectedCell({ rowIndex: Math.min(maxRow, rowIndex + 1), colIndex });
          e.preventDefault();
          break;
        case 'ArrowLeft':
          setSelectedCell({ rowIndex, colIndex: Math.max(0, colIndex - 1) });
          e.preventDefault();
          break;
        case 'ArrowRight':
          setSelectedCell({ rowIndex, colIndex: Math.min(maxCol, colIndex + 1) });
          e.preventDefault();
          break;
        default:
          // Start typing opens editor for text-like columns
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const col = table.columns[colIndex];
            if (col && ['text', 'number', 'url', 'email'].includes(col.type)) {
              setEditingCell({ rowIndex, colIndex });
            }
          }
      }
    },
    [selectedCell, editingCell, tableRows, table.columns, handleCellSave, searchOpen],
  );

  const handleRowContextMenu = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowId });
  };

  const handleDuplicate = useCallback(
    (rowId: string) => {
      const row = rows.find((r) => r.id === rowId);
      if (row) createRow.mutate({ tableId: table.id, data: { ...row.data } });
    },
    [rows, createRow],
  );

  const handleDelete = useCallback(
    (rowId: string) => {
      deleteRow.mutate({ id: rowId, tableId: table.id });
    },
    [deleteRow],
  );

  const toggleSelectAll = () => {
    if (selectedRows.size === tableRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(tableRows.map((r) => r.original.id)));
    }
  };

  const toggleSelectRow = (rowId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleQuickAdd = async () => {
    const val = quickAddValue.trim();
    const data: Record<string, unknown> = {};
    if (val && firstTextCol) data[firstTextCol.id] = val;
    createRow.mutate({ tableId: table.id, data });
    setQuickAddValue('');
  };

  // â”€â”€ isSearchMatch helper
  const isSearchMatch = (rowIndex: number, colIndex: number) => {
    if (!searchQuery.trim()) return false;
    return searchMatches.some((m) => m.rowIndex === rowIndex && m.colIndex === colIndex);
  };

  const isCurrentMatch = (rowIndex: number, colIndex: number) => {
    return currentMatch?.rowIndex === rowIndex && currentMatch?.colIndex === colIndex;
  };

  // â”€â”€ Total width for colgroup
  const checkboxWidth = 40;
  const rownumWidth = 48;
  const totalWidth =
    checkboxWidth +
    rownumWidth +
    table.columns.reduce((sum, c) => sum + (widths[c.id] ?? 160), 0) +
    48; // add column button

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      outline-none
      style={{ outline: 'none' }}
    >
      {/* â”€â”€ Search Bar */}
      {searchOpen && (
        <div
          className="absolute top-2 right-2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl border"
          style={{
            backgroundColor: 'var(--color-surface-raised, #1e1e2e)',
            borderColor: 'var(--color-border, rgba(255,255,255,0.15))',
          }}
        >
          <Search size={14} className="opacity-50 shrink-0" />
          <input
            ref={searchInputRef}
            className="bg-transparent text-sm outline-none w-48 placeholder:opacity-40"
            placeholder="Search cellsâ€¦"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchMatchIndex(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchQuery('');
              } else if (e.key === 'Enter') {
                if (e.shiftKey) goPrevMatch();
                else goNextMatch();
                e.preventDefault();
              }
            }}
          />
          {searchQuery && (
            <span className="text-xs opacity-50 shrink-0 whitespace-nowrap">
              {searchMatches.length > 0
                ? `${searchMatchIndex + 1}/${searchMatches.length}`
                : '0 results'}
            </span>
          )}
          <button
            className="opacity-50 hover:opacity-100 shrink-0"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* â”€â”€ Table Scroll Area */}
      <div className="overflow-auto flex-1">
        <table
          className="border-collapse text-sm"
          style={{ width: totalWidth, tableLayout: 'fixed' }}
        >
          {/* colgroup */}
          <colgroup>
            <col style={{ width: checkboxWidth }} />
            <col style={{ width: rownumWidth }} />
            {table.columns.map((col) => (
              <col key={col.id} style={{ width: widths[col.id] ?? 160 }} />
            ))}
            <col style={{ width: 48 }} />
          </colgroup>

          {/* â”€â”€ Header */}
          <thead>
            <tr>
              {/* Select all */}
              <th
                className="sticky top-0 z-20 border-b border-r"
                style={{
                  backgroundColor: 'var(--color-surface-raised, #1e1e2e)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
                  width: checkboxWidth,
                }}
              >
                <div className="flex items-center justify-center h-full py-2">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === tableRows.length && tableRows.length > 0}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </div>
              </th>
              {/* Row number header */}
              <th
                className="sticky top-0 z-20 border-b border-r text-xs opacity-40 font-normal"
                style={{
                  backgroundColor: 'var(--color-surface-raised, #1e1e2e)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
                  width: rownumWidth,
                }}
              >
                #
              </th>
              {/* Column headers */}
              {table.columns.map((col) => (
                <ResizableHeader
                  key={col.id}
                  col={col}
                  table={table}
                  sorts={sorts}
                  onSortsChange={onSortsChange}
                  onWidthChange={() => {}}
                  startResize={startResize}
                  width={widths[col.id] ?? 160}
                />
              ))}
              {/* Add column */}
              <th
                className="sticky top-0 z-20 border-b"
                style={{
                  backgroundColor: 'var(--color-surface-raised, #1e1e2e)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
                  width: 48,
                }}
              >
                <button
                  className="flex items-center justify-center w-full h-full py-2 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={onShowAddColumn}
                  title="Add column"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>

          {/* â”€â”€ Body */}
          <tbody>
            {tableRows.map((row, rIdx) => {
              const isEven = rIdx % 2 === 0;
              const isRowSelected = selectedRows.has(row.original.id);
              return (
                <tr
                  key={row.original.id}
                  onContextMenu={(e) => handleRowContextMenu(e, row.original.id)}
                  style={{
                    backgroundColor: isRowSelected
                      ? 'var(--color-accent-muted, rgba(99,102,241,0.12))'
                      : isEven
                      ? 'var(--color-surface, #13131f)'
                      : 'var(--color-surface-alt, #161624)',
                  }}
                >
                  {/* Checkbox */}
                  <td
                    className="border-b border-r"
                    style={{ borderColor: 'var(--color-border, rgba(255,255,255,0.06))' }}
                  >
                    <div className="flex items-center justify-center py-1">
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={() => toggleSelectRow(row.original.id)}
                        className="cursor-pointer"
                      />
                    </div>
                  </td>
                  {/* Row number + drag handle */}
                  <td
                    className="border-b border-r text-xs opacity-30 select-none"
                    style={{ borderColor: 'var(--color-border, rgba(255,255,255,0.06))' }}
                  >
                    <div className="flex items-center justify-end gap-0.5 pr-2 py-1">
                      {/* Drag handle (visual only) */}
                      <span
                        className="opacity-0 group-hover:opacity-100 cursor-grab text-base leading-none mr-0.5"
                        style={{ letterSpacing: '-1px', fontSize: 12, lineHeight: 1 }}
                        title="Drag to reorder"
                      >
                        â ¿
                      </span>
                      <span>{rIdx + 1}</span>
                    </div>
                  </td>
                  {/* Data cells */}
                  {table.columns.map((col, cIdx) => {
                    const value = row.original.data[col.id];
                    const isSelected =
                      selectedCell?.rowIndex === rIdx && selectedCell?.colIndex === cIdx;
                    const isEditing =
                      editingCell?.rowIndex === rIdx && editingCell?.colIndex === cIdx;
                    const isMatch = isSearchMatch(rIdx, cIdx);
                    const isCurrent = isCurrentMatch(rIdx, cIdx);
                    const condStyle = getCellCondStyle(value, col.type);

                    return (
                      <td
                        key={col.id}
                        className="border-b border-r relative"
                        style={{
                          borderColor: 'var(--color-border, rgba(255,255,255,0.06))',
                          outline: isSelected ? '2px solid var(--color-accent, #6366f1)' : undefined,
                          outlineOffset: isSelected ? '-2px' : undefined,
                          backgroundColor: isCurrent
                            ? 'rgba(99,102,241,0.25)'
                            : isMatch
                            ? 'rgba(99,102,241,0.12)'
                            : condStyle.backgroundColor,
                          color: condStyle.color,
                          padding: 0,
                          height: 34,
                          overflow: 'hidden',
                        }}
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        onDoubleClick={() => handleCellDoubleClick(rIdx, cIdx)}
                      >
                        {isEditing ? (
                          <CellEditor
                            column={col}
                            value={value}
                            onSave={(v) => handleCellSave(row.original.id, col.id, v)}
                            onCancel={() => setEditingCell(null)}
                            
                          />
                        ) : (
                          <div className="flex items-center h-full px-2 truncate">
                            <DisplayCell
                              value={value}
                              type={col.type}
                              options={col.options}
                              formula={col.formula}
                              rowData={row.original.data}
                              columns={table.columns}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {/* Spacer */}
                  <td
                    className="border-b"
                    style={{ borderColor: 'var(--color-border, rgba(255,255,255,0.06))' }}
                  />
                </tr>
              );
            })}
          </tbody>

          {/* â”€â”€ Summary / Aggregation Row */}
          <tfoot>
            <tr>
              {/* Checkbox col */}
              <td
                style={{
                  backgroundColor: 'var(--color-surface-agg, #191928)',
                  borderTop: '2px solid var(--color-border, rgba(255,255,255,0.10))',
                  borderRight: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                }}
              />
              {/* Row num col */}
              <td
                className="text-xs px-2 font-medium opacity-50"
                style={{
                  backgroundColor: 'var(--color-surface-agg, #191928)',
                  borderTop: '2px solid var(--color-border, rgba(255,255,255,0.10))',
                  borderRight: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                }}
              >
                Î£
              </td>
              {table.columns.map((col) => {
                const agg = aggregations[col.id] ?? 'none';
                const vals = filteredRows.map((r) => r.data[col.id]);
                const result = computeAggregation(agg, vals);
                return (
                  <td
                    key={col.id}
                    style={{
                      backgroundColor: 'var(--color-surface-agg, #191928)',
                      borderTop: '2px solid var(--color-border, rgba(255,255,255,0.10))',
                      borderRight: '1px solid var(--color-border, rgba(255,255,255,0.08))',
                      height: 32,
                      padding: 0,
                    }}
                  >
                    <AggregationDropdown
                      colType={col.type}
                      value={agg}
                      onChange={(v) =>
                        setAggregations((prev) => ({ ...prev, [col.id]: v }))
                      }
                      result={result}
                    />
                  </td>
                );
              })}
              <td
                style={{
                  backgroundColor: 'var(--color-surface-agg, #191928)',
                  borderTop: '2px solid var(--color-border, rgba(255,255,255,0.10))',
                }}
              />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* â”€â”€ Inline Quick-Add Row */}
      <div
        className="flex items-center gap-2 border-t px-3 py-1.5 shrink-0"
        style={{
          borderColor: 'var(--color-border, rgba(255,255,255,0.08))',
          backgroundColor: 'var(--color-surface, #13131f)',
        }}
      >
        <Plus size={14} className="opacity-40 shrink-0" />
        {firstTextCol ? (
          <input
            ref={quickAddRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-30"
            placeholder={`New row â€” type ${firstTextCol.name} and press Enter`}
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
          />
        ) : (
          <button
            className="text-sm opacity-40 hover:opacity-70 transition-opacity"
            onClick={() => createRow.mutate({ tableId: table.id, data: {} })}
          >
            New row
          </button>
        )}
        {quickAddValue && (
          <button
            className="text-xs opacity-50 hover:opacity-100 px-2 py-0.5 rounded border"
            style={{ borderColor: 'var(--color-border, rgba(255,255,255,0.12))' }}
            onClick={handleQuickAdd}
          >
            Add â†µ
          </button>
        )}
      </div>

      {/* â”€â”€ Row Context Menu */}
      {contextMenu && (
        <RowContextMenuEl
          menu={contextMenu}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default TableGrid;

