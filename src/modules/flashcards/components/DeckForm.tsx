import { useState } from 'react';
import type { CreateDeckInput, UpdateDeckInput, Deck } from '@/shared/types/flashcard';

export const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#f97316', // orange
] as const;

interface DeckFormProps {
  initialData?: Deck;
  onSave: (data: CreateDeckInput | UpdateDeckInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeckForm({ initialData, onSave, onCancel, isLoading }: DeckFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [color, setColor] = useState<string>(initialData?.color ?? PRESET_COLORS[0]);
  const [newCardsPerDay, setNewCardsPerDay] = useState(initialData?.newCardsPerDay ?? 20);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      newCardsPerDay,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Deck Name <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. JavaScript Fundamentals"
          autoFocus
          className="input-base px-3 py-2.5 rounded-lg text-sm"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Description
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this deck about?"
          rows={2}
          className="input-base px-3 py-2 rounded-lg text-sm resize-none"
        />
      </div>

      {/* Color picker */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Deck Color
        </label>
        <div className="flex gap-2.5 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
              style={{
                backgroundColor: c,
                outline: color === c ? `2px solid ${c}` : '2px solid transparent',
                outlineOffset: '2px',
                boxShadow: color === c ? `0 0 0 4px ${c}22` : 'none',
              }}
              title={c}
              aria-label={`Color ${c}`}
            >
              {color === c && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* New cards per day */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          New Cards Per Day
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={newCardsPerDay}
            onChange={(e) => setNewCardsPerDay(Math.max(1, parseInt(e.target.value, 10) || 1))}
            min={1}
            max={200}
            className="input-base px-3 py-2 rounded-lg text-sm w-24"
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Max new cards introduced each day
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm transition-colors mt-4"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 mt-4"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => {
            if (!isLoading && name.trim()) e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          {isLoading ? 'Saving…' : initialData ? 'Save Changes' : 'Create Deck'}
        </button>
      </div>
    </form>
  );
}
