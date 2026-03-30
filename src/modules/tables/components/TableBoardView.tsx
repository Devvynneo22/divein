import { useState, useCallback, useRef } from 'react';
import { GripVertical, Plus, Columns3 } from 'lucide-react';
import type { TableDef, TableRow, ColumnDef } from '@/shared/types/table';
import { useUpdateCell } from '../hooks/useTables';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableBoardViewProps {
  table: TableDef;
  rows: TableRow[];
  groupByColumnId: string;
  onGroupByChange: (columnId: string) => void;
}

// ─── Cell Preview ─────────────────────────────────────────────────────────────

function CellPreview({ column, value }: { column: ColumnDef; value: unknown }) {
  switch (column.type) {
    case 'checkbox':
      return (
        <span
          className="text-[11px] font-medium"
          style={{ color: value ? 'var(--color-success)' : 'var(--color-text-muted)' }}
        >
          {value ? '✓ Yes' : '✗ No'}
        </span>
      );
    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-0.5">
          {arr.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-px rounded-full text-[10px] font-medium"
              style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              {tag}
            </span>
          ))}
          {arr.length > 2 && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              +{arr.length - 2}
            </span>
          )}
        </div>
      );
    }
    case 'select':
      return (
        <span
          className="px-1.5 py-px rounded-full text-[10px] font-medium"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
        >
          {String(value)}
        </span>
      );
    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] truncate max-w-[150px]"
          style={{ color: 'var(--color-accent)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );
    default:
      return (
        <span className="text-[11px] truncate max-w-[150px]" style={{ color: 'var(--color-text-secondary)' }}>
          {String(value)}
        </span>
      );
  }
}

// ─── Board Card ───────────────────────────────────────────────────────────────

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

  const titleCol = table.columns.find((c) => c.type === 'text');
  const title = titleCol ? String(row.data[titleCol.id] ?? '').trim() : '';

  const previewCols = table.columns
    .filter((c) => c.id !== titleCol?.id && c.id !== groupByColumnId)
    .slice(0, 3);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, row.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all select-none"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical
          size={13}
          className="mt-0.5 flex-shrink-0 transition-opacity"
          style={{ color: 'var(--color-text-muted)', opacity: hovered ? 0.7 : 0 }}
        />
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p
            className="text-sm font-medium leading-tight"
            style={{ color: title ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
          >
            {title || <em>Untitled</em>}
          </p>

          {/* Field previews */}
          {previewCols.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {previewCols.map((col) => {
                const val = row.data[col.id];
                if (val === null || val === undefined || val === '') return null;
                return (
                  <div key={col.id} className="flex items-center gap-1.5">
                    <span
                      className="flex-shrink-0 text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: 'var(--color-text-muted)', minWidth: '0' }}
                    >
                      {col.name}
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

// ─── Board Column ─────────────────────────────────────────────────────────────

const COLUMN_ACCENT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

function getColumnColor(label: string): string {
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLUMN_ACCENT_COLORS[h % COLUMN_ACCENT_COLORS.length];
}

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
  onAddCard,
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
  onAddCard: () => void;
}) {
  const accentColor = label === 'Uncategorized' ? 'var(--color-text-muted)' : getColumnColor(label);

  return (
    <div
      className="flex flex-col rounded-xl flex-shrink-0 transition-all"
      style={{
        width: '280px',
        backgroundColor: isDragOver ? 'var(--color-accent-soft)' : 'var(--color-bg-secondary)',
        border: isDragOver
          ? '1px solid var(--color-accent)'
          : '1px solid var(--color-border)',
        boxShadow: isDragOver ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header stripe */}
      <div
        style={{
          height: '3px',
          borderRadius: '12px 12px 0 0',
          background: accentColor,
          opacity: 0.8,
        }}
      />

      {/* Column header */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span
          className="text-xs font-semibold truncate flex-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {label}
        </span>
        <span
          className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-muted)',
          }}
        >
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2"
        style={{ minHeight: '80px', maxHeight: '60vh' }}
      >
        {cards.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-8 rounded-lg text-[11px] italic"
            style={{
              color: 'var(--color-text-muted)',
              border: '1px dashed var(--color-border)',
              margin: '4px 0',
            }}
          >
            Drop cards here
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

      {/* Add card button */}
      <div className="px-2.5 pb-2.5">
        <button
          onClick={onAddCard}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <Plus size={12} />
          Add card
        </button>
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

  // Placeholder — actual row creation would need access to createRow hook
  // This is called from the column's "Add card" button
  function handleAddCard(_columnValue: string) {
    // No-op placeholder; real implementation would createRow with columnId = columnValue
  }

  if (!groupByColumn || selectColumns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div
          className="flex flex-col items-center gap-3 text-center p-8 rounded-2xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <Columns3 size={22} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
              No Select column found
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Add a <strong>Select</strong> column to enable Board view — each option becomes a column.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const options = groupByColumn.options ?? [];

  // Group rows by selected column value
  const grouped: Record<string, TableRow[]> = {};
  const uncategorized: TableRow[] = [];

  for (const opt of options) grouped[opt] = [];

  for (const row of rows) {
    const val = row.data[groupByColumnId];
    const key = val != null && val !== '' ? String(val) : null;
    if (key && key in grouped) {
      grouped[key].push(row);
    } else if (key) {
      grouped[key] = [row];
    } else {
      uncategorized.push(row);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Group-by selector toolbar */}
      {selectColumns.length > 1 && (
        <div
          className="px-6 py-2 flex items-center gap-2 text-xs flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <Columns3 size={12} style={{ color: 'var(--color-text-muted)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Group by</span>
          <select
            value={groupByColumnId}
            onChange={(e) => onGroupByChange(e.target.value)}
            className="rounded-lg px-2 py-1 text-xs outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            {selectColumns.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
          <span
            className="ml-auto text-[11px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Drag cards between columns to reassign
          </span>
        </div>
      )}

      {/* Board scroll area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full px-6 py-4 min-w-max">
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
              onDrop={(e) => { e.preventDefault(); handleDrop(opt); }}
              onAddCard={() => handleAddCard(opt)}
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
              onDrop={(e) => { e.preventDefault(); handleDrop(''); }}
              onAddCard={() => handleAddCard('')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
