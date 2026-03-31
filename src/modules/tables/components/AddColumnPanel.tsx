import { useState } from 'react';
import { Plus, X, Type, Hash, Calendar, CheckSquare, List, Link, Mail, Tags } from 'lucide-react';
import type { ColumnDef, ColumnType } from '@/shared/types/table';

interface AddColumnPanelProps {
  onSave: (column: ColumnDef) => void;
  onCancel: () => void;
}

const COLUMN_TYPES: { type: ColumnType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'text', label: 'Text', icon: <Type size={13} />, desc: 'Free-form text' },
  { type: 'number', label: 'Number', icon: <Hash size={13} />, desc: 'Numeric values' },
  { type: 'date', label: 'Date', icon: <Calendar size={13} />, desc: 'Date & time' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={13} />, desc: 'True / false' },
  { type: 'select', label: 'Select', icon: <List size={13} />, desc: 'Single choice' },
  { type: 'multiselect', label: 'Multi-select', icon: <Tags size={13} />, desc: 'Multiple choices' },
  { type: 'url', label: 'URL', icon: <Link size={13} />, desc: 'Web link' },
  { type: 'email', label: 'Email', icon: <Mail size={13} />, desc: 'Email address' },
  {
    type: 'formula',
    label: 'Formula',
    icon: <span className="text-xs font-bold italic leading-none">ƒ</span>,
    desc: 'Computed value',
  },
  { type: 'rating' as ColumnType, label: 'Rating', icon: <span className="text-xs">⭐</span>, desc: '1-5 star rating' },
  { type: 'progress' as ColumnType, label: 'Progress', icon: <span className="text-xs">📊</span>, desc: 'Percentage 0-100%' },
];

// Pastel swatches for select options
const OPTION_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
];

function hashColor(str: string): string {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return OPTION_COLORS[h % OPTION_COLORS.length];
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '7px 12px',
  fontSize: '13px',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

export function AddColumnPanel({ onSave, onCancel }: AddColumnPanelProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const [options, setOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [optionInput, setOptionInput] = useState('');
  const [formula, setFormula] = useState('');
  const [width, setWidth] = useState('150');

  const needsOptions = type === 'select' || type === 'multiselect';
  const needsFormula = type === 'formula';

  function addOption() {
    const trimmed = optionInput.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setOptionInput('');
    }
  }

  function removeOption(opt: string) {
    setOptions(options.filter((o) => o !== opt));
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const parsedWidth = parseInt(width, 10);
    const col: ColumnDef = {
      id: crypto.randomUUID(),
      name: trimmedName,
      type,
      width: isNaN(parsedWidth) || parsedWidth < 60 ? 150 : parsedWidth,
      ...(needsOptions && { options }),
      ...(needsFormula && { formula: formula.trim() }),
    };
    onSave(col);
  }

  const selectedTypeInfo = COLUMN_TYPES.find((t) => t.type === type);

  return (
    <div className="flex flex-col" style={{ maxHeight: '520px', overflow: 'hidden' }}>
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Add Column
        </h3>
        <button
          onClick={onCancel}
          className="transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Column name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="e.g. Status, Priority, Due Date…"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
        </div>

        {/* Type grid */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Column type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {COLUMN_TYPES.map(({ type: t, label, icon }) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: active ? 'white' : 'var(--color-text-secondary)',
                    border: active ? '1px solid var(--color-accent)' : '1px solid transparent',
                    fontWeight: active ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          {selectedTypeInfo && (
            <p className="mt-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {selectedTypeInfo.desc}
            </p>
          )}
        </div>

        {/* Options for select/multiselect */}
        {needsOptions && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Options
            </label>
            <div className="flex flex-col gap-1 mb-2">
              {options.map((opt) => {
                const color = hashColor(opt);
                return (
                  <div
                    key={opt}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs group"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                    }}
                  >
                    {/* Color swatch */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="flex-1" style={{ color: 'var(--color-text-primary)' }}>
                      {opt}
                    </span>
                    <button
                      onClick={() => removeOption(opt)}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1">
              <input
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addOption(); }
                }}
                placeholder="Add option…"
                style={{ ...inputStyle, padding: '5px 10px', fontSize: '12px' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              <button
                onClick={addOption}
                className="px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Formula */}
        {needsFormula && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Formula
            </label>
            <input
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g. SUM(Price, Tax)"
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            <div
              className="mt-2 px-2.5 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Functions
              </p>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'IF'].map((fn) => (
                  <span
                    key={fn}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-accent)' }}
                    onClick={() => setFormula((f) => f + (f ? ' ' : '') + fn + '()')}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-accent)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-elevated)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-accent)'; }}
                  >
                    {fn}()
                  </span>
                ))}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Use column names as references. Arithmetic: <code style={{ color: 'var(--color-accent)' }}>+ - * /</code>
              </p>
            </div>
          </div>
        )}

        {/* Width */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
            Width <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(px)</span>
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            min={60}
            max={600}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
        </div>
      </div>

      {/* Footer actions */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => {
            if (name.trim()) e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          Add Column
        </button>
      </div>
    </div>
  );
}
