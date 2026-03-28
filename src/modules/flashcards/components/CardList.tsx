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

const STATUS_BADGE: Record<
  CardStatus,
  { label: string; className: string }
> = {
  new: {
    label: 'New',
    className:
      'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30',
  },
  learning: {
    label: 'Learning',
    className:
      'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30',
  },
  review: {
    label: 'Review',
    className:
      'bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/30',
  },
  suspended: {
    label: 'Suspended',
    className:
      'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
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
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors self-start"
      >
        <Plus size={14} />
        Add Card
      </button>

      {/* Inline form */}
      {showForm && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
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
        <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
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
                className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] border border-transparent hover:border-[var(--color-border)] transition-all"
              >
                {/* Front text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] truncate">
                    {card.front}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                    {card.back}
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>

                {/* Next review */}
                <span className="flex-shrink-0 text-xs text-[var(--color-text-muted)] w-14 text-right">
                  {formatNextReview(card.nextReview)}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => deleteCard.mutate(card.id)}
                  className={`flex-shrink-0 p-1 rounded text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                  title="Delete card"
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
