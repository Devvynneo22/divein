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
];

export function AddColumnPanel({ onSave, onCancel }: AddColumnPanelProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const [options, setOptions] = useState<string[]>(['Option 1']);
  const [optionInput, setOptionInput] = useState('');
  const [width, setWidth] = useState('150');

  const needsOptions = type === 'select' || type === 'multiselect';

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
    };
    onSave(col);
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Add Column</h3>

      {/* Name */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Column name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Name..."
          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Type</label>
        <div className="grid grid-cols-2 gap-1">
          {COLUMN_TYPES.map(({ type: t, label, icon }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                type === t
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-hover)]'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Options for select/multiselect */}
      {needsOptions && (
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">Options</label>
          <div className="flex flex-col gap-1 mb-2">
            {options.map((opt) => (
              <div
                key={opt}
                className="flex items-center justify-between px-2 py-1 rounded bg-[var(--color-bg-tertiary)] text-xs text-[var(--color-text-primary)]"
              >
                <span>{opt}</span>
                <button
                  onClick={() => removeOption(opt)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
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
              className="flex-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
            />
            <button
              onClick={addOption}
              className="px-2 py-1 rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Width */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          Width (px, optional)
        </label>
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          min={60}
          max={600}
          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-3 py-1.5 rounded-md text-xs bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Column
        </button>
      </div>
    </div>
  );
}
