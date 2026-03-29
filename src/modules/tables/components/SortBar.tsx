import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { ColumnDef, TableSort } from '@/shared/types/table';

interface SortBarProps {
  columns: ColumnDef[];
  sorts: TableSort[];
  onChange: (sorts: TableSort[]) => void;
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  padding: '2px 8px',
  fontSize: '12px',
  color: 'var(--color-text-primary)',
  outline: 'none',
};

export function SortBar({ columns, sorts, onChange }: SortBarProps) {
  function addSort() {
    if (columns.length === 0) return;
    // Pick first column not already sorted
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

  function clearAll() {
    onChange([]);
  }

  return (
    <div
      className="flex flex-col gap-2 p-3"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {sorts.map((sort, i) => (
          <div
            key={i}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Priority indicator */}
            {sorts.length > 1 && (
              <span className="mr-0.5" style={{ color: 'var(--color-text-muted)' }}>{i + 1}.</span>
            )}

            {/* Column */}
            <select
              value={sort.columnId}
              style={selectStyle}
              onChange={(e) => updateSort(i, { columnId: e.target.value })}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Direction toggle */}
            <button
              onClick={() =>
                updateSort(i, {
                  direction: sort.direction === 'asc' ? 'desc' : 'asc',
                })
              }
              className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              {sort.direction === 'asc' ? (
                <>
                  <ArrowUp size={10} /> Asc
                </>
              ) : (
                <>
                  <ArrowDown size={10} /> Desc
                </>
              )}
            </button>

            {/* Remove */}
            <button
              onClick={() => removeSort(i)}
              className="ml-0.5 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Add sort */}
        <button
          onClick={addSort}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-dashed transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Plus size={12} /> Add sort
        </button>

        {sorts.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs ml-auto transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            Clear sorts
          </button>
        )}
      </div>
    </div>
  );
}
