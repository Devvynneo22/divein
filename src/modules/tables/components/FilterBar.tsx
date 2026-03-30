import { useState } from 'react';
import { Plus, X, Filter } from 'lucide-react';
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

const noValueOps: Operator[] = ['empty', 'notEmpty'];

// ─── Filter Pill ──────────────────────────────────────────────────────────────

function FilterPill({
  filter,
  index,
  columns,
  onUpdate,
  onRemove,
}: {
  filter: TableFilter;
  index: number;
  columns: ColumnDef[];
  onUpdate: (index: number, patch: Partial<TableFilter>) => void;
  onRemove: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const col = columns.find((c) => c.id === filter.columnId);
  const operators = col ? getOperators(col.type) : [];
  const hideValue = noValueOps.includes(filter.operator);
  const opLabel = operators.find((o) => o.value === filter.operator)?.label ?? filter.operator;

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 500,
    border: '1px solid var(--color-accent)',
    backgroundColor: 'var(--color-accent-soft)',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  };

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

  if (!expanded) {
    return (
      <div
        style={pillStyle}
        onClick={() => setExpanded(true)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-accent)';
          (e.currentTarget as HTMLElement).style.color = 'white';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-accent-soft)';
          (e.currentTarget as HTMLElement).style.color = 'var(--color-accent)';
        }}
      >
        <span style={{ fontWeight: 600 }}>{col?.name ?? '?'}</span>
        <span style={{ opacity: 0.75 }}>{opLabel}</span>
        {!hideValue && filter.value !== '' && filter.value != null && (
          <span style={{ fontWeight: 600 }}>
            {typeof filter.value === 'boolean'
              ? filter.value
                ? 'checked'
                : 'unchecked'
              : String(filter.value)}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          style={{ color: 'inherit', opacity: 0.7, display: 'flex', alignItems: 'center' }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = '0.7';
          }}
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs"
      style={{
        border: '1px solid var(--color-accent)',
        backgroundColor: 'var(--color-bg-elevated)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Column selector */}
      <select
        value={filter.columnId}
        style={selectStyle}
        onChange={(e) => {
          const newCol = columns.find((c) => c.id === e.target.value);
          if (!newCol) return;
          const ops = getOperators(newCol.type);
          onUpdate(index, { columnId: e.target.value, operator: ops[0].value, value: '' });
        }}
      >
        {columns.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={filter.operator}
        style={selectStyle}
        onChange={(e) => onUpdate(index, { operator: e.target.value as Operator, value: '' })}
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value */}
      {!hideValue && (
        col?.type === 'checkbox' ? (
          <select
            value={String(filter.value)}
            style={selectStyle}
            onChange={(e) => onUpdate(index, { value: e.target.value === 'true' })}
          >
            <option value="true">Checked</option>
            <option value="false">Unchecked</option>
          </select>
        ) : col?.type === 'select' && col.options ? (
          <select
            value={String(filter.value ?? '')}
            style={selectStyle}
            onChange={(e) => onUpdate(index, { value: e.target.value })}
          >
            <option value="">Any</option>
            {col.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            autoFocus
            value={String(filter.value ?? '')}
            type={col?.type === 'number' ? 'number' : col?.type === 'date' ? 'date' : 'text'}
            placeholder="Value…"
            style={{ ...selectStyle, width: '100px' }}
            onChange={(e) => onUpdate(index, { value: e.target.value })}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setExpanded(false); }}
          />
        )
      )}

      {/* Done editing */}
      <button
        onClick={() => setExpanded(false)}
        className="flex items-center justify-center w-4 h-4 rounded-full transition-colors"
        style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        ✓
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        className="transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

export function FilterBar({ columns, filters, onChange }: FilterBarProps) {
  function addFilter() {
    if (columns.length === 0) return;
    const col = columns[0];
    const ops = getOperators(col.type);
    onChange([...filters, { columnId: col.id, operator: ops[0].value, value: '' }]);
  }

  function updateFilter(index: number, patch: Partial<TableFilter>) {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
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
        <Filter size={12} style={{ color: 'var(--color-accent)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Filter by
        </span>
      </div>

      {/* Active filter pills */}
      {filters.map((filter, i) => (
        <FilterPill
          key={i}
          filter={filter}
          index={i}
          columns={columns}
          onUpdate={updateFilter}
          onRemove={removeFilter}
        />
      ))}

      {/* Add filter */}
      <button
        onClick={addFilter}
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
        Add filter
      </button>

      {/* Clear all */}
      {filters.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="ml-auto text-xs transition-colors flex items-center gap-1"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <X size={11} />
          Clear all
        </button>
      )}
    </div>
  );
}
