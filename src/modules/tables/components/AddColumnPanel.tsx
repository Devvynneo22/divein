import { useState } from 'react';
import { Plus, X, Type, Hash, Calendar, CheckSquare, List, Link, Mail, Tags } from 'lucide-react';
import type { ColumnDef, ColumnType } from '@/shared/types/table';

interface AddColumnPanelProps {
  onSave: (column: ColumnDef) => void;
  onCancel: () => void;
}

const COLUMN_TYPES: { type: ColumnType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type size={14} /> },
  { type: 'number', label: 'Number', icon: <Hash size={14} /> },
  { type: 'date', label: 'Date', icon: <Calendar size={14} /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={14} /> },
  { type: 'select', label: 'Select', icon: <List size={14} /> },
  { type: 'multiselect', label: 'Multi-select', icon: <Tags size={14} /> },
  { type: 'url', label: 'URL', icon: <Link size={14} /> },
  { type: 'email', label: 'Email', icon: <Mail size={14} /> },
  { type: 'formula', label: 'Formula', icon: <span className="text-xs font-bold italic leading-none">ƒ</span> },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '13px',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

export function AddColumnPanel({ onSave, onCancel }: AddColumnPanelProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const [options, setOptions] = useState<string[]>(['Option 1']);
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

  return (
    <div className="p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add Column</h3>

      {/* Name */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Column name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Name..."
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Type</label>
        <div className="grid grid-cols-2 gap-1">
          {COLUMN_TYPES.map(({ type: t, label, icon }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors"
              style={{
                backgroundColor: type === t ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: type === t ? 'white' : 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (type !== t) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (type !== t) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Options for select/multiselect */}
      {needsOptions && (
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Options</label>
          <div className="flex flex-col gap-1 mb-2">
            {options.map((opt) => (
              <div
                key={opt}
                className="flex items-center justify-between px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
              >
                <span>{opt}</span>
                <button
                  onClick={() => removeOption(opt)}
                  className="transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOption();
                }
              }}
              placeholder="Add option..."
              style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            <button
              onClick={addOption}
              className="px-2 py-1 rounded-md transition-colors"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Formula input */}
      {needsFormula && (
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Formula</label>
          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g. SUM(Price, Tax)"
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
          <div className="mt-2 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Functions
            </p>
            <div className="flex flex-wrap gap-1">
              {['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'IF'].map((fn) => (
                <span
                  key={fn}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-accent)' }}
                  onClick={() => setFormula((f) => f + (f ? ' ' : '') + fn + '()')}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                >
                  {fn}()
                </span>
              ))}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Use column names as references. Arithmetic: <code style={{ color: 'var(--color-accent)' }}>+ - * /</code>
            </p>
          </div>
        </div>
      )}

      {/* Width */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Width (px, optional)
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

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
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
          className="px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => {
            if (name.trim()) e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          Add Column
        </button>
      </div>
    </div>
  );
}
