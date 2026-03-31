import { useState, KeyboardEvent } from 'react';
import { X, Brain, Play } from 'lucide-react';
import { getDeckGradient } from './DeckCard';
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
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      newCardsPerDay,
      tags,
    });
  }

  const gradient = getDeckGradient(color);

  return (
    <div className="flex gap-6 items-start">
    {/* ── Live mini DeckCard preview ── */}
    <div className="hidden sm:flex flex-col gap-2 flex-shrink-0" style={{ width: '160px' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Preview</p>
      <div
        className="relative flex flex-col rounded-xl overflow-hidden select-none"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Header */}
        <div
          className="relative flex items-end px-3 pb-2"
          style={{ height: '52px', background: gradient, overflow: 'hidden' }}
        >
          {/* Dot pattern */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '8px 8px',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          />
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mr-1.5 relative z-10"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Brain size={11} color="white" />
          </div>
          <p
            className="text-xs font-bold truncate relative z-10"
            style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {name || 'Deck Name'}
          </p>
        </div>
        {/* Body */}
        <div className="p-3 flex flex-col gap-2">
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>0 cards · 0 due</div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {/* Mini progress bar */}
          <div
            className="h-1 rounded-full mt-1"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <div className="h-full rounded-full w-0" style={{ background: gradient }} />
          </div>
          {/* Study button */}
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-white mt-1"
            style={{ background: gradient, opacity: 0.8 }}
          >
            <Play size={9} fill="white" />
            Study
          </button>
        </div>
      </div>
    </div>

    <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1 min-w-0">
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
          rows={3}
          className="input-base px-3 py-2 rounded-lg text-sm resize-none"
        />
      </div>

      {/* Color picker */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Deck Color
        </label>
        <div className="flex gap-3 flex-wrap">
          {PRESET_COLORS.map((c) => {
            const isSelected = color === c;
            const grad = getDeckGradient(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                aria-label={`Color ${c}`}
                className="relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: grad,
                  outline: isSelected ? `2px solid ${c}` : '2px solid transparent',
                  outlineOffset: '2px',
                  boxShadow: isSelected ? `0 0 0 4px ${c}33` : '0 1px 4px rgba(0,0,0,0.15)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, outline 0.15s ease',
                }}
              >
                {isSelected && (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 6.5l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {/* Preview strip */}
        <div
          className="h-2 rounded-full mt-1"
          style={{ background: getDeckGradient(color), transition: 'background 0.2s ease' }}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Tags
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-muted)' }}>(Enter or comma)</span>
        </label>
        <div
          className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg min-h-[40px]"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-border)',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 transition-colors"
                style={{ color: 'var(--color-accent)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <X size={9} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? 'Add tags…' : ''}
            className="flex-1 min-w-[100px] bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>

      {/* New cards per day */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Cards Per Day
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={newCardsPerDay}
            onChange={(e) => setNewCardsPerDay(Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            min={1}
            max={200}
            className="input-base px-3 py-2 rounded-lg text-sm w-24"
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            New cards introduced each day (max 200)
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1 border-t mt-1" style={{ borderColor: 'var(--color-border)' }}>
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
    </div>
  );
}
