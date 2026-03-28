import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { ColumnDef, TableSort } from '@/shared/types/table';

interface SortBarProps {
  columns: ColumnDef[];
  sorts: TableSort[];
  onChange: (sorts: TableSort[]) => void;
}

const selectClass =
  'bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors';

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
    <div className="flex flex-col gap-2 p-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
      <div className="flex items-center gap-2 flex-wrap">
        {sorts.map((sort, i) => (
          <div
            key={i}
            className="flex items-center gap-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs"
          >
            {/* Priority indicator */}
            {sorts.length > 1 && (
              <span className="text-[var(--color-text-muted)] mr-0.5">{i + 1}.</span>
            )}

            {/* Column */}
            <select
              value={sort.columnId}
              className={selectClass}
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
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors text-[var(--color-text-secondary)]"
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
              className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors ml-0.5"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Add sort */}
        <button
          onClick={addSort}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] border border-dashed border-[var(--color-border)] transition-colors"
        >
          <Plus size={12} /> Add sort
        </button>

        {sorts.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors ml-auto"
          >
            Clear sorts
          </button>
        )}
      </div>
    </div>
  );
}
