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

  const baseInputClass =
    'w-full h-full bg-transparent text-[var(--color-text-primary)] text-sm outline-none px-2 py-1';

  // ── Text / URL / Email ────────────────────────────────────────────────────
  if (column.type === 'text' || column.type === 'url' || column.type === 'email') {
    const [local, setLocal] = useState(toStringValue(value));
    return (
      <input
        ref={inputRef}
        type={column.type === 'email' ? 'email' : column.type === 'url' ? 'url' : 'text'}
        value={local}
        className={baseInputClass}
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
        className={baseInputClass}
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
    // value is ISO string or null
    const dateStr = toStringValue(value).slice(0, 10); // YYYY-MM-DD
    const [local, setLocal] = useState(dateStr);
    return (
      <input
        ref={inputRef}
        type="date"
        value={local}
        className={`${baseInputClass} [color-scheme:dark]`}
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
        className={`${baseInputClass} cursor-pointer`}
        autoFocus
        onChange={(e) => {
          setLocal(e.target.value);
          onSave(e.target.value || null);
        }}
        onBlur={() => onSave(local || null)}
        onKeyDown={handleKey}
        style={{ background: 'var(--color-bg-tertiary)' }}
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
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              selected.includes(opt)
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-hover)]'
            }`}
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
