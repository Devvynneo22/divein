import { useState } from 'react';
import { Table2 } from 'lucide-react';
import type { TableDef } from '@/shared/types/table';

interface TableCardProps {
  table: TableDef;
  rowCount: number;
  onClick: () => void;
}

export function TableCard({ table, rowCount, onClick }: TableCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-xl p-5 transition-all"
      style={{
        border: `1px solid ${hovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        backgroundColor: hovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors"
        style={{
          backgroundColor: hovered ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
        }}
      >
        {table.icon ? (
          <span className="text-xl leading-none">{table.icon}</span>
        ) : (
          <Table2
            size={20}
            style={{ color: hovered ? 'var(--color-accent)' : 'var(--color-text-muted)', transition: 'color 0.15s' }}
          />
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold truncate mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {table.name}
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>{table.columns.length} {table.columns.length === 1 ? 'column' : 'columns'}</span>
        <span>·</span>
        <span>{rowCount} {rowCount === 1 ? 'row' : 'rows'}</span>
      </div>
    </button>
  );
}
