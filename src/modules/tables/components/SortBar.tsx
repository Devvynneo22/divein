import { Plus, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { ColumnDef, TableSort } from '@/shared/types/table';

interface SortBarProps {
  columns: ColumnDef[];
  sorts: TableSort[];
  onChange: (sorts: TableSort[]) => void;
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '3px 8px',
  fontSize: '11px',
  color: 'var(--color-text-primary)',
  outline: 'none',
  cursor: 'pointer',
};

// ─── Sort Pill ────────────────────────────────────────────────────────────────

function SortPill({
  sort,
  index,
  total,
  columns,
  onUpdate,
  onRemove,
}: {
  sort: TableSort;
  index: number;
  total: number;
  columns: ColumnDef[];
  onUpdate: (index: number, patch: Partial<TableSort>) => void;
  onRemove: (index: number) => void;
}) {
  const col = columns.find((c) => c.id === sort.columnId);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs transition-all"
      style={{
        border: '1px solid var(--color-accent)',
        backgroundColor: 'var(--color-accent-soft)',
        color: 'var(--color-accent)',
      }}
    >
      {/* Priority badge */}
      {total > 1 && (
        <span
          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        >
          {index + 1}
        </span>
      )}

      {/* Column selector */}
      <select
        value={sort.columnId}
        style={{
          ...selectStyle,
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--color-accent)',
          fontWeight: 600,
          padding: '0',
          fontSize: '11px',
        }}
        onChange={(e) => onUpdate(index, { columnId: e.target.value })}
      >
        {columns.map((c) => (
          <option key={c.id} value={c.id} style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Direction toggle */}
      <button
        onClick={() => onUpdate(index, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'white',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        title={sort.direction === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
      >
        {sort.direction === 'asc' ? (
          <><ArrowUp size={10} /> Asc</>
        ) : (
          <><ArrowDown size={10} /> Desc</>
        )}
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        className="transition-colors"
        style={{ color: 'var(--color-accent)', opacity: 0.6 }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)';
          (e.currentTarget as HTMLElement).style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--color-accent)';
          (e.currentTarget as HTMLElement).style.opacity = '0.6';
        }}
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ─── SortBar ──────────────────────────────────────────────────────────────────

export function SortBar({ columns, sorts, onChange }: SortBarProps) {
  function addSort() {
    if (columns.length === 0) return;
    const used = new Set(sorts.map((s) => s.columnId));
    const available = columns.find((c) => !used.has(c.id)) ?? columns[0];
    onChange([...sorts, { columnId: available.id, direction: 'asc' }]);
  }

  function updateSort(index: number, patch: Partial<TableSort>) {
    onChange(sorts.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSort(index: number) {
    onChange(sorts.filter((_, i) => i !== index));
  }

  return (
    <div
      className="px-6 py-2 flex items-center gap-2 flex-wrap"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ArrowUpDown size={12} style={{ color: 'var(--color-accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Sort by
        </span>
      </div>

      {/* Sort pills */}
      {sorts.map((sort, i) => (
        <SortPill
          key={i}
          sort={sort}
          index={i}
          total={sorts.length}
          columns={columns}
          onUpdate={updateSort}
          onRemove={removeSort}
        />
      ))}

      {/* Add sort */}
      <button
        onClick={addSort}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all"
        style={{
          border: '1px dashed var(--color-border)',
          color: 'var(--color-text-muted)',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
          e.currentTarget.style.color = 'var(--color-accent)';
          e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Plus size={10} />
        Add sort
      </button>

      {/* Clear sorts */}
      {sorts.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="ml-auto text-xs transition-colors flex items-center gap-1"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <X size={11} />
          Clear sorts
        </button>
      )}
    </div>
  );
}
