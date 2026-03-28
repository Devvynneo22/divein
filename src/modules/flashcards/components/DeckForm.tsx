import { useState } from 'react';
import type { CreateDeckInput, UpdateDeckInput, Deck } from '@/shared/types/flashcard';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#f97316', // orange
];

interface DeckFormProps {
  initialData?: Deck;
  onSave: (data: CreateDeckInput | UpdateDeckInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeckForm({ initialData, onSave, onCancel, isLoading }: DeckFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [color, setColor] = useState(initialData?.color ?? PRESET_COLORS[0]);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          Deck Name <span className="text-[var(--color-danger)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. JavaScript Fundamentals"
          autoFocus
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
        />
      </div>

      {/* Color picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          Color
        </label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: '2px',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* New cards per day */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          New Cards Per Day
        </label>
        <input
          type="number"
          value={newCardsPerDay}
          onChange={(e) => setNewCardsPerDay(Math.max(1, parseInt(e.target.value, 10) || 1))}
          min={1}
          max={200}
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors w-32"
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          Maximum new cards to introduce each day.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Deck'}
        </button>
      </div>
    </form>
  );
}
