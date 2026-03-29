import { useState, useRef, useEffect } from 'react';
import {
  Type,
  Hash,
  Calendar,
  CheckSquare,
  List,
  Link,
  Mail,
  Tags,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Pencil,
  Trash2,
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

const TYPE_ICONS: Record<ColumnType, React.ReactNode> = {
  text: <Type size={12} />,
  number: <Hash size={12} />,
  date: <Calendar size={12} />,
  checkbox: <CheckSquare size={12} />,
  select: <List size={12} />,
  multiselect: <Tags size={12} />,
  url: <Link size={12} />,
  email: <Mail size={12} />,
  formula: <span className="text-[10px] font-bold italic leading-none">ƒ</span>,
};

const COLUMN_TYPES: ColumnType[] = [
  'text',
  'number',
  'date',
  'checkbox',
  'select',
  'multiselect',
  'url',
  'email',
  'formula',
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
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  function commitRename() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(trimmed);
    }
    setRenaming(false);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(true);
  }

  const SortIcon =
    sortDirection === 'asc'
      ? ArrowUp
      : sortDirection === 'desc'
        ? ArrowDown
        : ArrowUpDown;

  return (
    <div
      className="flex items-center gap-1.5 w-full h-full group relative select-none"
      onContextMenu={handleContextMenu}
    >
      {/* Type icon */}
      <span className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
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
          className="flex-1 text-xs font-medium px-1 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            outline: '1px solid var(--color-accent)',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-xs font-medium truncate cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
          onClick={onSort}
        >
          {column.name}
        </span>
      )}

      {/* Sort icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSort();
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: sortDirection !== false ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        aria-label="Sort"
      >
        <SortIcon size={12} />
      </button>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-0.5"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
      >
        ···
      </button>

      {/* Context menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-xl min-w-[160px] py-1 text-xs"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
            onClick={() => {
              setMenuOpen(false);
              setRenaming(true);
              setNameInput(column.name);
            }}
          >
            <Pencil size={12} /> Rename
          </button>

          {/* Change type submenu items */}
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '4px', paddingTop: '4px' }}>
            <p
              className="px-3 py-1 text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Change type
            </p>
            {COLUMN_TYPES.map((t) => (
              <button
                key={t}
                className="flex items-center gap-2 w-full px-3 py-1.5 transition-colors"
                style={{
                  color: t === column.type ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (t !== column.type) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (t !== column.type) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }
                }}
                onClick={() => {
                  onChangeType(t);
                  setMenuOpen(false);
                }}
              >
                <span style={{ color: 'var(--color-text-muted)' }}>{TYPE_ICONS[t]}</span>
                <span className="capitalize">{t}</span>
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '4px', paddingTop: '4px' }}>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 transition-colors"
              style={{ color: 'var(--color-danger)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              onClick={() => {
                setMenuOpen(false);
                if (!window.confirm(`Delete column '${column.name}'? Data in all rows will be lost.`)) return;
                onDelete();
              }}
            >
              <Trash2 size={12} /> Delete column
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
