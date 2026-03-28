import { Table2 } from 'lucide-react';
import type { TableDef } from '@/shared/types/table';

interface TableCardProps {
  table: TableDef;
  rowCount: number;
  onClick: () => void;
}

export function TableCard({ table, rowCount, onClick }: TableCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)] transition-all"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-3 group-hover:bg-[var(--color-accent)]/10 transition-colors">
        {table.icon ? (
          <span className="text-xl leading-none">{table.icon}</span>
        ) : (
          <Table2 size={20} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate mb-1">
        {table.name}
      </h3>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span>{table.columns.length} {table.columns.length === 1 ? 'column' : 'columns'}</span>
        <span>·</span>
        <span>{rowCount} {rowCount === 1 ? 'row' : 'rows'}</span>
      </div>
    </button>
  );
}
