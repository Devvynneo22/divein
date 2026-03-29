import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import type { Card, CardStatus } from '@/shared/types/flashcard';
import { CardForm } from './CardForm';
import { useCreateCard, useDeleteCard } from '../hooks/useFlashcards';

interface CardListProps {
  deckId: string;
  cards: Card[];
}

const STATUS_BADGE: Record<CardStatus, { label: string; bgVar: string; colorVar: string; borderVar: string }> = {
  new: {
    label: 'New',
    bgVar: 'var(--color-accent-soft)',
    colorVar: 'var(--color-accent)',
    borderVar: 'var(--color-accent-muted)',
  },
  learning: {
    label: 'Learning',
    bgVar: 'var(--color-warning-soft)',
    colorVar: 'var(--color-warning)',
    borderVar: 'var(--color-warning)',
  },
  review: {
    label: 'Review',
    bgVar: 'var(--color-success-soft)',
    colorVar: 'var(--color-success)',
    borderVar: 'var(--color-success)',
  },
  suspended: {
    label: 'Suspended',
    bgVar: 'var(--color-bg-tertiary)',
    colorVar: 'var(--color-text-muted)',
    borderVar: 'var(--color-border)',
  },
};

function formatNextReview(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isPast(date)) return 'Overdue';
    return format(date, 'MMM d');
  } catch {
    return dateStr;
  }
}

export function CardList({ deckId, cards }: CardListProps) {
  const [showForm, setShowForm] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const createCard = useCreateCard();
  const deleteCard = useDeleteCard();

  function handleCreate(data: Parameters<typeof createCard.mutate>[0]) {
    createCard.mutate(data, {
      onSuccess: () => setShowForm(false),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Add card button */}
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm transition-colors self-start"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
          e.currentTarget.style.color = 'var(--color-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
      >
        <Plus size={14} />
        Add Card
      </button>

      {/* Inline form */}
      {showForm && (
        <div
          className="rounded-xl p-5"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            New Card
          </h3>
          <CardForm
            deckId={deckId}
            onSave={(data) => handleCreate(data as Parameters<typeof createCard.mutate>[0])}
            onCancel={() => setShowForm(false)}
            isLoading={createCard.isPending}
          />
        </div>
      )}

      {/* Card list */}
      {cards.length === 0 && !showForm ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No cards yet. Add your first card above.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {cards.map((card) => {
            const badge = STATUS_BADGE[card.status];
            const isHovered = hoveredId === card.id;
            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredId(card.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                style={{
                  backgroundColor: isHovered ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${isHovered ? 'var(--color-border)' : 'transparent'}`,
                }}
              >
                {/* Front text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {card.front}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {card.back}
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: badge.bgVar,
                    color: badge.colorVar,
                    border: `1px solid ${badge.borderVar}`,
                  }}
                >
                  {badge.label}
                </span>

                {/* Next review */}
                <span className="flex-shrink-0 text-xs w-14 text-right" style={{ color: 'var(--color-text-muted)' }}>
                  {formatNextReview(card.nextReview)}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => {
                    if (!window.confirm('Delete this card?')) return;
                    deleteCard.mutate(card.id);
                  }}
                  className="flex-shrink-0 p-1 rounded transition-all"
                  style={{
                    color: 'var(--color-danger)',
                    opacity: isHovered ? 1 : 0,
                  }}
                  title="Delete card"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
