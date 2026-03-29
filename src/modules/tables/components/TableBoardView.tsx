import { useState, useCallback, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { TableDef, TableRow, ColumnDef } from '@/shared/types/table';
import { useUpdateCell } from '../hooks/useTables';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableBoardViewProps {
  table: TableDef;
  rows: TableRow[];
  groupByColumnId: string;
  onGroupByChange: (columnId: string) => void;
}

// ─── Card Component ───────────────────────────────────────────────────────────

function BoardCard({
  row,
  table,
  groupByColumnId,
  onDragStart,
}: {
  row: TableRow;
  table: TableDef;
  groupByColumnId: string;
  onDragStart: (e: React.DragEvent, rowId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Find the first text column for the title
  const titleCol = table.columns.find((c) => c.type === 'text');
  const title = titleCol ? String(row.data[titleCol.id] ?? '') : row.id.slice(0, 8);

  // Preview: show up to 3 other columns (not the title or groupBy column)
  const previewCols = table.columns
    .filter((c) => c.id !== titleCol?.id && c.id !== groupByColumnId)
    .slice(0, 3);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, row.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all"
      style={{
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        backgroundColor: 'var(--color-bg-primary)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'none',
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={14}
          className="mt-0.5 flex-shrink-0 transition-opacity"
          style={{
            color: 'var(--color-text-muted)',
            opacity: hovered ? 1 : 0,
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
            {title || <span className="italic" style={{ color: 'var(--color-text-muted)' }}>Untitled</span>}
          </p>
          {previewCols.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {previewCols.map((col) => {
                const val = row.data[col.id];
                if (val === null || val === undefined || val === '') return null;
                return (
                  <div key={col.id} className="flex items-center gap-1.5 text-[11px]">
                    <span className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {col.name}:
                    </span>
                    <CellPreview column={col} value={val} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CellPreview({ column, value }: { column: ColumnDef; value: unknown }) {
  switch (column.type) {
    case 'checkbox':
      return (
        <span style={{ color: value ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
          {value ? '✓' : '✗'}
        </span>
      );
    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-0.5">
          {arr.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1 py-0 rounded text-[10px]"
              style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              {tag}
            </span>
          ))}
          {arr.length > 2 && (
            <span style={{ color: 'var(--color-text-muted)' }}>+{arr.length - 2}</span>
          )}
        </div>
      );
    }
    case 'select':
      return (
        <span
          className="px-1 py-0 rounded text-[10px]"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
        >
          {String(value)}
        </span>
      );
    default:
      return (
        <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {String(value)}
        </span>
      );
  }
}

// ─── Board Column ─────────────────────────────────────────────────────────────

function BoardColumn({
  label,
  cards,
  table,
  groupByColumnId,
  onDragStart,
  onDrop,
  isDragOver,
  onDragOver,
  onDragLeave,
}: {
  label: string;
  cards: TableRow[];
  table: TableDef;
  groupByColumnId: string;
  onDragStart: (e: React.DragEvent, rowId: string) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}) {
  return (
    <div
      className="flex flex-col min-w-[260px] max-w-[320px] w-[280px] flex-shrink-0 rounded-xl transition-colors"
      style={{
        backgroundColor: isDragOver ? 'var(--color-accent-soft)' : 'var(--color-bg-secondary)',
        outline: isDragOver ? '2px solid var(--color-accent-muted)' : 'none',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div
        className="px-3 py-2.5 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
        <span
          className="text-[10px] rounded-full px-1.5 py-0.5 font-medium"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
        >
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        {cards.length === 0 ? (
          <div className="text-center py-6 text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>
            No items
          </div>
        ) : (
          cards.map((row) => (
            <BoardCard
              key={row.id}
              row={row}
              table={table}
              groupByColumnId={groupByColumnId}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Board View ──────────────────────────────────────────────────────────

export function TableBoardView({
  table,
  rows,
  groupByColumnId,
  onGroupByChange,
}: TableBoardViewProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const dragRowId = useRef<string | null>(null);
  const updateCell = useUpdateCell();

  const selectColumns = table.columns.filter((c) => c.type === 'select');
  const groupByColumn = table.columns.find((c) => c.id === groupByColumnId);

  const onDragStart = useCallback((e: React.DragEvent, rowId: string) => {
    dragRowId.current = rowId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
  }, []);

  const handleDrop = useCallback(
    (targetValue: string) => {
      const rowId = dragRowId.current;
      if (!rowId || !groupByColumnId) return;
      updateCell.mutate({
        rowId,
        columnId: groupByColumnId,
        value: targetValue || undefined,
        tableId: table.id,
      });
      dragRowId.current = null;
      setDragOverColumn(null);
    },
    [groupByColumnId, table.id, updateCell],
  );

  if (!groupByColumn || selectColumns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            No select columns available
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Add a &quot;Select&quot; column to use Board view
          </p>
        </div>
      </div>
    );
  }

  const options = groupByColumn.options ?? [];

  // Group rows by the selected column value
  const grouped: Record<string, TableRow[]> = {};
  const uncategorized: TableRow[] = [];

  for (const opt of options) {
    grouped[opt] = [];
  }

  for (const row of rows) {
    const val = row.data[groupByColumnId];
    const key = val != null && val !== '' ? String(val) : null;
    if (key && grouped[key]) {
      grouped[key].push(row);
    } else if (key && !grouped[key]) {
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(row);
    } else {
      uncategorized.push(row);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Group-by selector (shown if multiple select columns) */}
      {selectColumns.length > 1 && (
        <div className="px-6 py-2 flex items-center gap-2 text-xs flex-shrink-0">
          <span style={{ color: 'var(--color-text-muted)' }}>Group by:</span>
          <select
            value={groupByColumnId}
            onChange={(e) => onGroupByChange(e.target.value)}
            className="rounded-md px-2 py-1 text-xs outline-none"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            {selectColumns.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-4">
        <div className="flex gap-3 h-full">
          {options.map((opt) => (
            <BoardColumn
              key={opt}
              label={opt}
              cards={grouped[opt] ?? []}
              table={table}
              groupByColumnId={groupByColumnId}
              onDragStart={onDragStart}
              isDragOver={dragOverColumn === opt}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverColumn(opt);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(opt);
              }}
            />
          ))}

          {/* Uncategorized column */}
          {uncategorized.length > 0 && (
            <BoardColumn
              label="Uncategorized"
              cards={uncategorized}
              table={table}
              groupByColumnId={groupByColumnId}
              onDragStart={onDragStart}
              isDragOver={dragOverColumn === '__uncategorized__'}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverColumn('__uncategorized__');
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop('');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
