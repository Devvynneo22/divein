import { useState, KeyboardEvent, useRef, useEffect } from 'react';
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
  const frontRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    frontRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    if (initialData) {
      const input: UpdateCardInput = { front: front.trim(), back: back.trim(), tags };
      onSave(input);
    } else {
      const input: CreateCardInput = { deckId, front: front.trim(), back: back.trim(), tags };
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Side-by-side Front / Back */}
      <div className="grid grid-cols-2 gap-4">
        {/* Front */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Q
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Front · Question
            </label>
          </div>
          <textarea
            ref={frontRef}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter the question or prompt…"
            rows={5}
            className="input-base px-3 py-2.5 rounded-xl text-sm resize-none leading-relaxed"
          />
        </div>

        {/* Back */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--color-success)' }}
            >
              A
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Back · Answer
            </label>
          </div>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Enter the answer…"
            rows={5}
            className="input-base px-3 py-2.5 rounded-xl text-sm resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Tags
          <span className="ml-1 font-normal" style={{ color: 'var(--color-text-muted)' }}>(press Enter or comma)</span>
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
                border: '1px solid var(--color-accent-muted)',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 transition-colors"
                style={{ color: 'var(--color-accent)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-muted)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {front.trim() && back.trim() ? '✓ Ready to save' : 'Fill in both sides to continue'}
        </span>
        <div className="flex gap-2">
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
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            onMouseEnter={(e) => {
              if (front.trim() && back.trim() && !isLoading)
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            {isLoading ? 'Saving…' : initialData ? 'Save Changes' : 'Add Card'}
          </button>
        </div>
      </div>
    </form>
  );
}
