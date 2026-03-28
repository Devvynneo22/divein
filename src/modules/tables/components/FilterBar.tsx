import { Plus, X } from 'lucide-react';
import type { ColumnDef, TableFilter } from '@/shared/types/table';

interface FilterBarProps {
  columns: ColumnDef[];
  filters: TableFilter[];
  onChange: (filters: TableFilter[]) => void;
}

type Operator = TableFilter['operator'];

function getOperators(colType: ColumnDef['type']): { value: Operator; label: string }[] {
  const textOps: { value: Operator; label: string }[] = [
    { value: 'contains', label: 'contains' },
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'empty', label: 'is empty' },
    { value: 'notEmpty', label: 'is not empty' },
  ];
  const numOps: { value: Operator; label: string }[] = [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '≥' },
    { value: 'lte', label: '≤' },
    { value: 'empty', label: 'is empty' },
    { value: 'notEmpty', label: 'is not empty' },
  ];
  const selectOps: { value: Operator; label: string }[] = [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'empty', label: 'is empty' },
    { value: 'notEmpty', label: 'is not empty' },
  ];

  switch (colType) {
    case 'number':
    case 'date':
      return numOps;
    case 'checkbox':
      return [{ value: 'eq', label: 'is' }];
    case 'select':
      return selectOps;
    case 'multiselect':
      return [
        { value: 'contains', label: 'contains' },
        { value: 'empty', label: 'is empty' },
        { value: 'notEmpty', label: 'is not empty' },
      ];
    default:
      return textOps;
  }
}

const selectClass =
  'bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors';

export function FilterBar({ columns, filters, onChange }: FilterBarProps) {
  function addFilter() {
    if (columns.length === 0) return;
    const col = columns[0];
    const ops = getOperators(col.type);
    onChange([
      ...filters,
      { columnId: col.id, operator: ops[0].value, value: '' },
    ]);
  }

  function updateFilter(index: number, patch: Partial<TableFilter>) {
    const updated = filters.map((f, i) =>
      i === index ? { ...f, ...patch } : f,
    );
    onChange(updated);
  }

  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }

  function clearAll() {
    onChange([]);
  }

  const noValueOps: Operator[] = ['empty', 'notEmpty'];

  return (
    <div className="flex flex-col gap-2 p-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter, i) => {
          const col = columns.find((c) => c.id === filter.columnId);
          const operators = col ? getOperators(col.type) : [];
          const hideValue = noValueOps.includes(filter.operator);

          return (
            <div
              key={i}
              className="flex items-center gap-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs"
            >
              {/* Column */}
              <select
                value={filter.columnId}
                className={selectClass}
                onChange={(e) => {
                  const newCol = columns.find((c) => c.id === e.target.value);
                  if (!newCol) return;
                  const ops = getOperators(newCol.type);
                  updateFilter(i, {
                    columnId: e.target.value,
                    operator: ops[0].value,
                    value: '',
                  });
                }}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={filter.operator}
                className={selectClass}
                onChange={(e) =>
                  updateFilter(i, { operator: e.target.value as Operator, value: '' })
                }
              >
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value */}
              {!hideValue && (
                <>
                  {col?.type === 'checkbox' ? (
                    <select
                      value={String(filter.value)}
                      className={selectClass}
                      onChange={(e) =>
                        updateFilter(i, { value: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Checked</option>
                      <option value="false">Unchecked</option>
                    </select>
                  ) : col?.type === 'select' && col.options ? (
                    <select
                      value={String(filter.value ?? '')}
                      className={selectClass}
                      onChange={(e) => updateFilter(i, { value: e.target.value })}
                    >
                      <option value="">Any</option>
                      {col.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={String(filter.value ?? '')}
                      type={col?.type === 'number' ? 'number' : col?.type === 'date' ? 'date' : 'text'}
                      className={`${selectClass} w-28`}
                      placeholder="Value..."
                      onChange={(e) => updateFilter(i, { value: e.target.value })}
                    />
                  )}
                </>
              )}

              {/* Remove */}
              <button
                onClick={() => removeFilter(i)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors ml-1"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* Add filter */}
        <button
          onClick={addFilter}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] border border-dashed border-[var(--color-border)] transition-colors"
        >
          <Plus size={12} /> Add filter
        </button>

        {filters.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors ml-auto"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
