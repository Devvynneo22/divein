import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import type { ColumnDef } from '@/shared/types/table';

interface CellEditorProps {
  column: ColumnDef;
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  onTabNext?: () => void;
  onTabPrev?: () => void;
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function toNumberValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function CellEditor({
  column,
  value,
  onSave,
  onCancel,
  onTabNext,
  onTabPrev,
}: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
      if (e.shiftKey) {
        onTabPrev?.();
      } else {
        onTabNext?.();
      }
    }
  }

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'transparent',
    color: 'var(--color-text-primary)',
    fontSize: '13px',
    outline: 'none',
    padding: '4px 8px',
  };

  // ── Text / URL / Email ────────────────────────────────────────────────────
  if (column.type === 'text' || column.type === 'url' || column.type === 'email') {
    const [local, setLocal] = useState(toStringValue(value));
    return (
      <input
        ref={inputRef}
        type={column.type === 'email' ? 'email' : column.type === 'url' ? 'url' : 'text'}
        value={local}
        style={baseInputStyle}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onSave(local || null)}
        onKeyDown={handleKey}
      />
    );
  }

  // ── Number ────────────────────────────────────────────────────────────────
  if (column.type === 'number') {
    const [local, setLocal] = useState(toNumberValue(value));
    return (
      <input
        ref={inputRef}
        type="number"
        value={local}
        style={baseInputStyle}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = parseFloat(local);
          onSave(isNaN(n) ? null : n);
        }}
        onKeyDown={handleKey}
      />
    );
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  if (column.type === 'date') {
    const dateStr = toStringValue(value).slice(0, 10); // YYYY-MM-DD
    const [local, setLocal] = useState(dateStr);
    return (
      <input
        ref={inputRef}
        type="date"
        value={local}
        style={{ ...baseInputStyle, colorScheme: 'dark' }}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onSave(local || null)}
        onKeyDown={handleKey}
      />
    );
  }

  // ── Select ────────────────────────────────────────────────────────────────
  if (column.type === 'select') {
    const options = column.options ?? [];
    const [local, setLocal] = useState(toStringValue(value));
    return (
      <select
        value={local}
        style={{ ...baseInputStyle, cursor: 'pointer', backgroundColor: 'var(--color-bg-tertiary)' }}
        autoFocus
        onChange={(e) => {
          setLocal(e.target.value);
          onSave(e.target.value || null);
        }}
        onBlur={() => onSave(local || null)}
        onKeyDown={handleKey}
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  // ── Multiselect ───────────────────────────────────────────────────────────
  if (column.type === 'multiselect') {
    const options = column.options ?? [];
    const currentValues: string[] = Array.isArray(value) ? (value as string[]) : [];
    const [selected, setSelected] = useState<string[]>(currentValues);

    function toggleOption(opt: string) {
      const next = selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt];
      setSelected(next);
      onSave(next.length > 0 ? next : null);
    }

    return (
      <div
        className="flex flex-wrap gap-1 p-1 min-h-full"
        tabIndex={0}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            onSave(selected.length > 0 ? selected : null);
          }
        }}
        onKeyDown={handleKey}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggleOption(opt)}
            className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: selected.includes(opt) ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: selected.includes(opt) ? 'white' : 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!selected.includes(opt)) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              if (!selected.includes(opt)) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // ── Formula — read-only, never editable ────────────────────────────────────
  // ── Checkbox — handled by click toggle in TableGrid, not rendered here ────
  return null;
}
