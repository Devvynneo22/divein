import { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { ColumnDef, ColumnType } from '@/shared/types/table';

interface ColumnHeaderProps {
  column: ColumnDef;
  sortDirection: 'asc' | 'desc' | false;
  onSort: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onChangeType: (type: ColumnType) => void;
}

const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  checkbox: 'Checkbox',
  select: 'Select',
  multiselect: 'Multi-select',
  url: 'URL',
  email: 'Email',
  formula: 'Formula',
};

// Compact text icons matching the spec
const TYPE_ICONS: Record<ColumnType, React.ReactNode> = {
  text: <span className="text-[11px] font-bold leading-none" style={{ fontFamily: 'serif' }}>Aa</span>,
  number: <span className="text-[12px] font-bold leading-none">#</span>,
  date: <span className="text-[12px] leading-none">📅</span>,
  checkbox: <span className="text-[12px] font-bold leading-none">✓</span>,
  select: <span className="text-[12px] leading-none">◉</span>,
  multiselect: <span className="text-[12px] leading-none">◈</span>,
  url: <span className="text-[11px] font-bold leading-none">🔗</span>,
  email: <span className="text-[11px] font-bold leading-none">@</span>,
  formula: <span className="text-[11px] font-bold italic leading-none">ƒ</span>,
};

const COLUMN_TYPES: ColumnType[] = [
  'text', 'number', 'date', 'checkbox', 'select', 'multiselect', 'url', 'email', 'formula',
];

export function ColumnHeader({
  column,
  sortDirection,
  onSort,
  onRename,
  onDelete,
  onChangeType,
}: ColumnHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<'type' | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(column.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSubMenu(null);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  function commitRename() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(trimmed);
    } else {
      setNameInput(column.name);
    }
    setRenaming(false);
  }

  const SortIcon = sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : null;

  return (
    <div
      className="flex items-center gap-1.5 w-full h-full group relative select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
        setSubMenu(null);
      }}
    >
      {/* Type icon */}
      <span
        className="flex-shrink-0 w-4 flex items-center justify-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {TYPE_ICONS[column.type]}
      </span>

      {/* Name / rename input */}
      {renaming ? (
        <input
          ref={inputRef}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setNameInput(column.name);
              setRenaming(false);
            }
          }}
          className="flex-1 text-xs font-semibold px-1 py-0.5 rounded min-w-0"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            outline: '1px solid var(--color-accent)',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-xs font-semibold truncate cursor-pointer min-w-0"
          style={{ color: 'var(--color-text-primary)' }}
          onClick={onSort}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setRenaming(true);
            setNameInput(column.name);
          }}
          title={column.name}
        >
          {column.name}
        </span>
      )}

      {/* Sort indicator (always visible when active) */}
      {SortIcon && (
        <SortIcon
          size={11}
          className="flex-shrink-0"
          style={{ color: 'var(--color-accent)' }}
        />
      )}

      {/* Menu trigger — visible on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
          setSubMenu(null);
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
      >
        <span style={{ fontSize: '14px', lineHeight: 1, letterSpacing: '0.05em' }}>···</span>
      </button>

      {/* Context menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 z-50 rounded-xl py-1.5 min-w-[180px]"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            boxShadow: 'var(--shadow-popup)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Rename */}
          <MenuItem
            icon={<Pencil size={13} />}
            label="Rename"
            onClick={() => {
              setMenuOpen(false);
              setSubMenu(null);
              setRenaming(true);
              setNameInput(column.name);
            }}
          />

          {/* Change type */}
          <div className="relative">
            <MenuItem
              icon={<span style={{ color: 'var(--color-text-muted)' }}>{TYPE_ICONS[column.type]}</span>}
              label="Change type"
              rightIcon={<ChevronRight size={12} />}
              onClick={() => setSubMenu(subMenu === 'type' ? null : 'type')}
              active={subMenu === 'type'}
            />
            {subMenu === 'type' && (
              <div
                className="absolute left-full top-0 ml-1 rounded-xl py-1.5 min-w-[160px]"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  boxShadow: 'var(--shadow-popup)',
                }}
              >
                {COLUMN_TYPES.map((t) => (
                  <button
                    key={t}
                    className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors"
                    style={{
                      color: t === column.type ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => {
                      onChangeType(t);
                      setMenuOpen(false);
                      setSubMenu(null);
                    }}
                  >
                    <span className="w-4 flex items-center justify-center flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                      {TYPE_ICONS[t]}
                    </span>
                    {TYPE_LABELS[t]}
                    {t === column.type && <Check size={11} className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort options */}
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
          <MenuItem
            icon={<ArrowUp size={13} />}
            label="Sort ascending"
            onClick={() => { onSort(); setMenuOpen(false); }}
          />
          <MenuItem
            icon={<ArrowDown size={13} />}
            label="Sort descending"
            onClick={() => { onSort(); setMenuOpen(false); }}
          />

          {/* Delete */}
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
          <button
            className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors"
            style={{ color: 'var(--color-danger)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            onClick={() => {
              setMenuOpen(false);
              if (!window.confirm(`Delete column "${column.name}"? All data in this column will be lost.`)) return;
              onDelete();
            }}
          >
            <Trash2 size={13} />
            Delete column
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  rightIcon,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  rightIcon?: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors"
      style={{
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        backgroundColor: active ? 'var(--color-bg-tertiary)' : 'transparent',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = active ? 'var(--color-bg-tertiary)' : 'transparent';
        e.currentTarget.style.color = active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)';
      }}
      onClick={onClick}
    >
      <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {rightIcon && <span style={{ color: 'var(--color-text-muted)' }}>{rightIcon}</span>}
    </button>
  );
}
