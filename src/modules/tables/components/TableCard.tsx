import { useState } from 'react';
import { Table2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { TableDef } from '@/shared/types/table';

interface TableCardProps {
  table: TableDef;
  rowCount: number;
  onClick: () => void;
}

// These are decorative palette colors (not theme colors), intentionally using
// fixed hues so cards have distinct visual identities regardless of theme.
const CARD_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];

function getTableColor(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return CARD_COLORS[hash % CARD_COLORS.length];
}

export function TableCard({ table, rowCount, onClick }: TableCardProps) {
  const [hovered, setHovered] = useState(false);
  const accentColor = getTableColor(table.id);

  let lastModified = '';
  try {
    lastModified = formatDistanceToNow(new Date(table.updatedAt), { addSuffix: true });
  } catch {
    lastModified = '';
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-xl transition-all overflow-hidden"
      style={{
        border: `1px solid ${hovered ? 'var(--color-border-hover, var(--color-border))' : 'var(--color-border)'}`,
        backgroundColor: hovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Colored top stripe */}
      <div
        style={{
          height: '3px',
          background: accentColor,
          opacity: hovered ? 1 : 0.7,
          transition: 'opacity 0.15s',
        }}
      />

      <div className="p-5">
        {/* Icon row */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              backgroundColor: hovered ? `${accentColor}20` : 'var(--color-bg-tertiary)',
            }}
          >
            {table.icon ? (
              <span className="text-xl leading-none">{table.icon}</span>
            ) : (
              <Table2
                size={20}
                style={{
                  color: hovered ? accentColor : 'var(--color-text-muted)',
                  transition: 'color 0.15s',
                }}
              />
            )}
          </div>

          {/* "Open" button — fades in on hover */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: accentColor,
              color: 'white',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'scale(1)' : 'scale(0.9)',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            Open
            <ExternalLink size={11} />
          </div>
        </div>

        {/* Name */}
        <h3
          className="text-sm font-semibold truncate mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {table.name}
        </h3>

        {/* Description */}
        {table.description && (
          <p
            className="text-xs truncate mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {table.description}
          </p>
        )}

        {/* Meta row */}
        <div
          className="flex items-center justify-between text-xs mt-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <div className="flex items-center gap-3">
            <span>
              {table.columns.length}{' '}
              {table.columns.length === 1 ? 'col' : 'cols'}
            </span>
            <span>·</span>
            <span>
              {rowCount} {rowCount === 1 ? 'row' : 'rows'}
            </span>
          </div>
          {lastModified && (
            <span className="truncate ml-2 max-w-[90px]" title={table.updatedAt}>
              {lastModified}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
