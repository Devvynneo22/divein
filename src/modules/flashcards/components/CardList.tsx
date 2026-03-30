import { useState } from 'react';
import { Plus, Trash2, Edit2, Search, X } from 'lucide-react';
import type { Card, CardStatus, CreateCardInput, UpdateCardInput } from '@/shared/types/flashcard';
import { CardForm } from './CardForm';
import { useCreateCard, useDeleteCard, useUpdateCard } from '../hooks/useFlashcards';

interface CardListProps {
  deckId: string;
  cards: Card[];
  onStudyAll?: () => void;
}

const STATUS_CONFIG: Record<CardStatus, { label: string; bgVar: string; colorVar: string }> = {
  new: { label: 'New', bgVar: 'var(--color-accent-soft)', colorVar: 'var(--color-accent)' },
  learning: { label: 'Learning', bgVar: 'var(--color-warning-soft)', colorVar: 'var(--color-warning)' },
  review: { label: 'Mastered', bgVar: 'var(--color-success-soft)', colorVar: 'var(--color-success)' },
  suspended: { label: 'Suspended', bgVar: 'var(--color-bg-tertiary)', colorVar: 'var(--color-text-muted)' },
};

type ModalState =
  | { mode: 'none' }
  | { mode: 'create' }
  | { mode: 'edit'; card: Card };

export function CardList({ deckId, cards, onStudyAll }: CardListProps) {
  const [modal, setModal] = useState<ModalState>({ mode: 'none' });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const createCard = useCreateCard();
  const deleteCard = useDeleteCard();
  const updateCard = useUpdateCard();

  const filtered = search.trim()
    ? cards.filter(
        (c) =>
          c.front.toLowerCase().includes(search.toLowerCase()) ||
          c.back.toLowerCase().includes(search.toLowerCase()),
      )
    : cards;

  // ─ Stats
  const newCount = cards.filter((c) => c.status === 'new').length;
  const learningCount = cards.filter((c) => c.status === 'learning').length;
  const masteredCount = cards.filter((c) => c.status === 'review').length;

  function handleCreate(data: CreateCardInput | UpdateCardInput) {
    createCard.mutate(data as CreateCardInput, {
      onSuccess: () => setModal({ mode: 'none' }),
    });
  }

  function handleUpdate(data: CreateCardInput | UpdateCardInput) {
    if (modal.mode !== 'edit') return;
    updateCard.mutate(
      { id: modal.card.id, data: data as UpdateCardInput },
      { onSuccess: () => setModal({ mode: 'none' }) },
    );
  }

  function handleDelete(card: Card) {
    if (!window.confirm(`Delete "${card.front.slice(0, 40)}…"?`)) return;
    deleteCard.mutate(card.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: stats + search + add */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stats pills */}
        <div className="flex gap-2">
          <StatPill label="New" count={newCount} color="var(--color-accent)" bg="var(--color-accent-soft)" />
          <StatPill label="Learning" count={learningCount} color="var(--color-warning)" bg="var(--color-warning-soft)" />
          <StatPill label="Mastered" count={masteredCount} color="var(--color-success)" bg="var(--color-success-soft)" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            minWidth: '180px',
          }}
        >
          <Search size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--color-text-muted)' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Study All */}
        {onStudyAll && (
          <button
            onClick={onStudyAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
            style={{ backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Study All
          </button>
        )}

        {/* Add Card */}
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          <Plus size={14} />
          Add Card
        </button>
      </div>

      {/* Inline form for create/edit */}
      {modal.mode !== 'none' && (
        <div
          className="rounded-2xl p-5"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {modal.mode === 'create' ? 'New Card' : 'Edit Card'}
          </h3>
          <CardForm
            deckId={deckId}
            initialData={modal.mode === 'edit' ? modal.card : undefined}
            onSave={modal.mode === 'create' ? handleCreate : handleUpdate}
            onCancel={() => setModal({ mode: 'none' })}
            isLoading={createCard.isPending || updateCard.isPending}
          />
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl text-center gap-4"
          style={{
            border: '1px dashed var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          {search ? (
            <>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                No cards matching "{search}"
              </p>
              <button
                onClick={() => setSearch('')}
                className="text-xs underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: '2rem' }}>🃏</span>
              <div>
                <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No cards yet</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Add your first card to start studying
                </p>
              </div>
              <button
                onClick={() => setModal({ mode: 'create' })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                <Plus size={14} />
                Add Card
              </button>
            </>
          )}
        </div>
      )}

      {/* Card rows */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {filtered.map((card) => {
            const isHovered = hoveredId === card.id;
            const isRevealed = revealedId === card.id;
            const statusCfg = STATUS_CONFIG[card.status];

            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredId(card.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all"
                style={{
                  backgroundColor: isHovered ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${isHovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
                  boxShadow: isHovered ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {/* Front */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {card.front}
                  </p>
                  {/* Answer — hidden until hover */}
                  <p
                    className="text-xs truncate mt-0.5 transition-all duration-200"
                    style={{
                      color: isRevealed ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                      filter: isRevealed ? 'none' : 'blur(4px)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setRevealedId(isRevealed ? null : card.id)}
                    title={isRevealed ? 'Click to hide' : 'Click to reveal answer'}
                  >
                    {card.back}
                  </p>
                </div>

                {/* Tags */}
                {card.tags.length > 0 && (
                  <div className="hidden sm:flex gap-1 flex-shrink-0">
                    {card.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'var(--color-bg-elevated)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Status badge */}
                <span
                  className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: statusCfg.bgVar,
                    color: statusCfg.colorVar,
                  }}
                >
                  {statusCfg.label}
                </span>

                {/* Action buttons on hover */}
                <div
                  className="flex gap-1 flex-shrink-0 transition-all duration-150"
                  style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none' }}
                >
                  <button
                    onClick={() => setModal({ mode: 'edit', card })}
                    className="p-1.5 rounded-lg transition-colors"
                    title="Edit card"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(card)}
                    className="p-1.5 rounded-lg transition-colors"
                    title="Delete card"
                    style={{ color: 'var(--color-danger)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      <span className="font-bold tabular-nums">{count}</span>
      <span>{label}</span>
    </div>
  );
}
