import React, { useState } from 'react';
import { Table2, Trash2, Hash, Calendar, CheckSquare, List, Star, BarChart2, Link2, Mail, Columns } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

type ColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'email'
  | 'formula'
  | 'rating'
  | 'progress';

interface ColumnDef {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
  options?: string[];
}

interface TableDef {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  icon: string | null;
  columns: ColumnDef[];
  createdAt: string;
  updatedAt: string;
}

interface TableCardProps {
  table: TableDef;
  rowCount: number;
  onClick: () => void;
  onDelete?: () => void;
}

// ─── Color palette ─────────────────────────────────────────────────────────────

const CARD_COLORS: Array<{ from: string; to: string; accent: string }> = [
  { from: '#6366f1', to: '#8b5cf6', accent: '#6366f1' }, // indigo → violet
  { from: '#3b82f6', to: '#06b6d4', accent: '#3b82f6' }, // blue → cyan
  { from: '#10b981', to: '#059669', accent: '#10b981' }, // emerald
  { from: '#f59e0b', to: '#f97316', accent: '#f59e0b' }, // amber → orange
  { from: '#ef4444', to: '#f43f5e', accent: '#ef4444' }, // red → rose
  { from: '#8b5cf6', to: '#ec4899', accent: '#8b5cf6' }, // violet → pink
  { from: '#14b8a6', to: '#0ea5e9', accent: '#14b8a6' }, // teal → sky
  { from: '#f97316', to: '#eab308', accent: '#f97316' }, // orange → yellow
  { from: '#84cc16', to: '#10b981', accent: '#84cc16' }, // lime → emerald
  { from: '#6366f1', to: '#3b82f6', accent: '#6366f1' }, // indigo → blue
];

function getTableColor(id: string): (typeof CARD_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return CARD_COLORS[hash % CARD_COLORS.length];
}

// ─── Column type icons ────────────────────────────────────────────────────────

function ColumnTypeIcon({ type }: { type: ColumnType }) {
  switch (type) {
    case 'text':
      return <span style={{ fontWeight: 700, fontSize: 11, fontFamily: 'serif', lineHeight: 1 }}>Aa</span>;
    case 'number':
      return <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1 }}>#</span>;
    case 'date':
      return <Calendar size={10} strokeWidth={2.5} />;
    case 'checkbox':
      return <CheckSquare size={10} strokeWidth={2.5} />;
    case 'select':
      return <List size={10} strokeWidth={2.5} />;
    case 'multiselect':
      return <List size={10} strokeWidth={2.5} />;
    case 'url':
      return <Link2 size={10} strokeWidth={2.5} />;
    case 'email':
      return <Mail size={10} strokeWidth={2.5} />;
    case 'formula':
      return <span style={{ fontWeight: 700, fontSize: 11, fontStyle: 'italic', lineHeight: 1 }}>ƒ</span>;
    case 'rating':
      return <Star size={10} strokeWidth={2.5} />;
    case 'progress':
      return <BarChart2 size={10} strokeWidth={2.5} />;
    default:
      return <span style={{ fontWeight: 700, fontSize: 11, lineHeight: 1 }}>?</span>;
  }
}

// ─── Keyframe style injection ─────────────────────────────────────────────────

const SHIMMER_STYLE_ID = 'tablecard-shimmer-keyframes';

function ensureShimmerKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SHIMMER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SHIMMER_STYLE_ID;
  style.textContent = `
    @keyframes tablecard-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes tablecard-fadein {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

ensureShimmerKeyframes();

// ─── Main component ───────────────────────────────────────────────────────────

export function TableCard({ table, rowCount, onClick, onDelete }: TableCardProps) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  const color = getTableColor(table.id);
  const previewCols = table.columns.slice(0, 4);
  const progressCol = table.columns.find((c) => c.type === 'progress');
  const columnCount = table.columns.length;

  // Parse updatedAt safely
  let lastModified = 'Unknown';
  try {
    const d = new Date(table.updatedAt);
    if (!isNaN(d.getTime())) {
      lastModified = formatDistanceToNow(d, { addSuffix: true });
    }
  } catch {
    // noop
  }

  // ── Card container ──────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    background: 'var(--color-bg-elevated)',
    border: hovered
      ? '1px solid var(--color-border-hover)'
      : '1px solid var(--color-border)',
    boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
    transform: hovered ? 'translateY(-3px) scale(1.01)' : 'translateY(0) scale(1)',
    transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
    userSelect: 'none',
    display: 'flex',
    flexDirection: 'column',
  };

  // ── Colored header ──────────────────────────────────────────────────────────
  const headerStyle: React.CSSProperties = {
    position: 'relative',
    height: 56,
    background: hovered
      ? `linear-gradient(135deg, ${color.from}, ${color.to}, ${color.from})`
      : `linear-gradient(135deg, ${color.from}, ${color.to})`,
    backgroundSize: hovered ? '200% 200%' : '100% 100%',
    animation: hovered ? 'tablecard-shimmer 1.8s linear infinite' : 'none',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 8,
    flexShrink: 0,
  };

  // Dot pattern overlay (SVG data URI)
  const dotPatternStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
    backgroundSize: '12px 12px',
    pointerEvents: 'none',
  };

  // ── Delete button ───────────────────────────────────────────────────────────
  const deleteBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: deleteHovered ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.35)',
    color: '#fff',
    opacity: hovered ? 1 : 0,
    transition: 'opacity 180ms ease, background 150ms ease, transform 150ms ease',
    transform: deleteHovered ? 'scale(1.1)' : 'scale(1)',
    backdropFilter: 'blur(4px)',
  };

  // ── Body ────────────────────────────────────────────────────────────────────
  const bodyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 12px 0',
    gap: 8,
  };

  // ── Column chips ────────────────────────────────────────────────────────────
  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 7px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 500,
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
    maxWidth: 90,
    overflow: 'hidden',
  };

  // ── Stats row ───────────────────────────────────────────────────────────────
  const statsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 11,
    color: 'var(--color-text-muted)',
    padding: '0 0 2px',
  };

  // ── Open button ─────────────────────────────────────────────────────────────
  const openBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    margin: '6px 12px 10px',
    padding: '5px 0',
    borderRadius: 8,
    border: `1px solid ${color.from}55`,
    background: hovered ? `${color.from}18` : 'transparent',
    color: hovered ? color.from : 'var(--color-text-muted)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    opacity: hovered ? 1 : 0,
    transform: hovered ? 'translateY(0)' : 'translateY(4px)',
    transition: 'opacity 200ms ease, transform 200ms ease, background 150ms ease, color 150ms ease',
    letterSpacing: '0.02em',
  };

  function handleCardClick(e: React.MouseEvent) {
    // Don't trigger onClick when delete button is clicked
    onClick();
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete?.();
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setDeleteHovered(false); }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={`Open table ${table.name}`}
    >
      {/* ── Colored header ── */}
      <div style={headerStyle}>
        {/* Dot pattern overlay */}
        <div style={dotPatternStyle} />

        {/* Icon */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            backdropFilter: 'blur(2px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          {table.icon ? (
            <span>{table.icon}</span>
          ) : (
            <Table2 size={16} color="#fff" strokeWidth={2} />
          )}
        </div>

        {/* Table name */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,0.35)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}
          >
            {table.name}
          </div>
          {table.description && (
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.75)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                marginTop: 1,
              }}
            >
              {table.description}
            </div>
          )}
        </div>

        {/* Delete button (inside header, top-right) */}
        {onDelete && (
          <button
            style={deleteBtnStyle}
            onClick={handleDeleteClick}
            onMouseEnter={() => setDeleteHovered(true)}
            onMouseLeave={() => setDeleteHovered(false)}
            aria-label="Delete table"
            tabIndex={hovered ? 0 : -1}
          >
            <Trash2 size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div style={bodyStyle}>
        {/* Column chips */}
        {previewCols.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {previewCols.map((col) => (
              <div key={col.id} style={chipStyle}>
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                  <ColumnTypeIcon type={col.type} />
                </span>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.name}
                </span>
              </div>
            ))}
            {table.columns.length > 4 && (
              <div
                style={{
                  ...chipStyle,
                  color: 'var(--color-text-muted)',
                  background: 'transparent',
                  border: '1px dashed var(--color-border)',
                }}
              >
                +{table.columns.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div style={statsStyle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Columns size={11} strokeWidth={2} style={{ opacity: 0.6 }} />
            {columnCount} col{columnCount !== 1 ? 's' : ''}
          </span>
          <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Hash size={11} strokeWidth={2} style={{ opacity: 0.6 }} />
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </span>
          <span style={{ opacity: 0.4, fontSize: 10 }}>·</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lastModified}
          </span>
        </div>

        {/* Progress indicator */}
        {progressCol && (
          <ProgressBar color={color.from} />
        )}
      </div>

      {/* ── Open button ── */}
      <button
        style={openBtnStyle}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        tabIndex={hovered ? 0 : -1}
        aria-label={`Open ${table.name}`}
      >
        Open →
      </button>
    </div>
  );
}

// ─── Progress bar sub-component ───────────────────────────────────────────────

function ProgressBar({ color }: { color: string }) {
  // Visual placeholder — a decorative mini bar.
  // In a real scenario you'd receive actual row data; here we render
  // a subtle bar hinting at the column's presence.
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 0 0',
      }}
    >
      <BarChart2 size={10} style={{ color, flexShrink: 0, opacity: 0.7 }} />
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 99,
          background: 'var(--color-bg-tertiary)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '60%', // decorative placeholder
            borderRadius: 99,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transition: 'width 400ms ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 10,
          color: 'var(--color-text-muted)',
          fontWeight: 600,
          minWidth: 28,
          textAlign: 'right',
        }}
      >
        prog
      </span>
    </div>
  );
}
