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

// Deterministic color palette for select options
const SELECT_COLORS = [
  { bg: '#e0e7ff', text: '#4338ca' },
  { bg: '#fce7f3', text: '#be185d' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#ffe4e6', text: '#be123c' },
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#f3e8ff', text: '#7e22ce' },
  { bg: '#ffedd5', text: '#9a3412' },
];

export function getSelectColor(option: string) {
  let hash = 0;
  for (const c of option) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return SELECT_COLORS[hash % SELECT_COLORS.length];
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
    } else if (e.key === 'Enter' && !(e.currentTarget instanceof HTMLTextAreaElement)) {
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
    border: 'none',
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
    const [local, setLocal] = useState(toStringValue(value));
    return (
      <input
        ref={inputRef}
        type="number"
        value={local}
        style={{ ...baseInputStyle, textAlign: 'right' }}
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
    const dateStr = toStringValue(value).slice(0, 10);
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

  // ── Select — pill dropdown ─────────────────────────────────────────────────
  if (column.type === 'select') {
    const options = column.options ?? [];
    const [local, setLocal] = useState(toStringValue(value));
    const [dropOpen, setDropOpen] = useState(true);

    return (
      <div className="relative w-full h-full" onKeyDown={handleKey} tabIndex={-1}>
        {/* Current value display */}
        <div
          className="w-full h-full flex items-center px-2 cursor-pointer"
          onClick={() => setDropOpen((v) => !v)}
        >
          {local ? (
            <SelectPill value={local} />
          ) : (
            <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
              Choose…
            </span>
          )}
        </div>

        {/* Dropdown */}
        {dropOpen && (
          <div
            className="absolute top-full left-0 mt-0.5 z-50 rounded-xl py-1.5 min-w-[160px] max-h-52 overflow-y-auto"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              boxShadow: 'var(--shadow-popup)',
            }}
            onMouseDown={(e) => e.preventDefault()} // prevent blur
          >
            {/* Clear option */}
            <button
              className="flex items-center w-full px-3 py-1.5 text-xs transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              onClick={() => { setLocal(''); onSave(null); setDropOpen(false); }}
            >
              <span className="italic">— None</span>
            </button>

            {options.map((opt) => {
              const colors = getSelectColor(opt);
              const isSelected = local === opt;
              return (
                <button
                  key={opt}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors"
                  style={{ backgroundColor: isSelected ? 'var(--color-bg-tertiary)' : 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? 'var(--color-bg-tertiary)' : 'transparent'; }}
                  onClick={() => {
                    setLocal(opt);
                    onSave(opt);
                    setDropOpen(false);
                  }}
                >
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {opt}
                  </span>
                  {isSelected && <span className="ml-auto text-[var(--color-accent)]">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
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
        className="flex flex-wrap gap-1 p-1.5 min-h-full overflow-hidden"
        tabIndex={0}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            onSave(selected.length > 0 ? selected : null);
          }
        }}
        onKeyDown={handleKey}
      >
        {options.map((opt) => {
          const colors = getSelectColor(opt);
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              className="px-2 py-0.5 rounded-full text-[11px] font-medium transition-all"
              style={{
                backgroundColor: isSelected ? colors.bg : 'var(--color-bg-tertiary)',
                color: isSelected ? colors.text : 'var(--color-text-secondary)',
                outline: isSelected ? `1.5px solid ${colors.text}40` : 'none',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Formula / Checkbox — handled externally ────────────────────────────────
  return null;
}

/** Reusable pill for displaying a select value */
export function SelectPill({ value }: { value: string }) {
  const colors = getSelectColor(value);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {value}
    </span>
  );
}
