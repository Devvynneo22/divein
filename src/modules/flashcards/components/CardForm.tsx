import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { Card, CreateCardInput, UpdateCardInput } from '@/shared/types/flashcard';

interface CardFormProps {
  deckId: string;
  initialData?: Card;
  onSave: (data: CreateCardInput | UpdateCardInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CardForm({ deckId, initialData, onSave, onCancel, isLoading }: CardFormProps) {
  const [front, setFront] = useState(initialData?.front ?? '');
  const [back, setBack] = useState(initialData?.back ?? '');
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    if (initialData) {
      const input: UpdateCardInput = {
        front: front.trim(),
        back: back.trim(),
        tags,
      };
      onSave(input);
    } else {
      const input: CreateCardInput = {
        deckId,
        front: front.trim(),
        back: back.trim(),
        tags,
      };
      onSave(input);
    }
  }

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Front */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Front (Question) <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Enter the question or prompt..."
          rows={4}
          autoFocus
          className="input-base px-3 py-2 rounded-lg text-sm resize-none"
        />
      </div>

      {/* Back */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Back (Answer) <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Enter the answer..."
          rows={4}
          className="input-base px-3 py-2 rounded-lg text-sm resize-none"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Tags
        </label>
        <div
          className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg min-h-[42px]"
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
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)...' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
            style={{
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!front.trim() || !back.trim() || isLoading}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => {
            if (front.trim() && back.trim() && !isLoading)
              e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          {isLoading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Card'}
        </button>
      </div>
    </form>
  );
}
