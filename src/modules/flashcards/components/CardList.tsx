import { useState } from 'react';
import { Plus, Trash2, Edit2, Search, X, Upload } from 'lucide-react';
import type { Card, CardStatus, CreateCardInput, UpdateCardInput } from '@/shared/types/flashcard';
import { CardForm } from './CardForm';
import { useCreateCard, useDeleteCard, useUpdateCard } from '../hooks/useFlashcards';
import { toast } from '@/shared/stores/toastStore';

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
  | { mode: 'edit'; card: Card }
  | { mode: 'import' };

export function CardList({ deckId, cards, onStudyAll }: CardListProps) {
  const [modal, setModal] = useState<ModalState>({ mode: 'none' });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

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

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    const lines = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const pairs: Array<{ front: string; back: string }> = [];
    for (const line of lines) {
      const parts = line.split(' | ');
      if (parts.length >= 2) {
        const front = parts[0].trim();
        const back = parts.slice(1).join(' | ').trim();
        if (front && back) pairs.push({ front, back });
      }
    }

    if (pairs.length === 0) {
      setImportMessage('No valid cards found. Use "Front | Back" format.');
      setTimeout(() => setImportMessage(null), 3000);
      return;
    }

    for (const pair of pairs) {
      await createCard.mutateAsync({ deckId, front: pair.front, back: pair.back, tags: [] });
    }

    setImportText('');
    setModal({ mode: 'none' });
    toast.success(`Imported ${pairs.length} card${pairs.length !== 1 ? 's' : ''}`);
    setImportMessage(`Imported ${pairs.length} card${pairs.length !== 1 ? 's' : ''}`);
    setTimeout(() => setImportMessage(null), 3000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stats pills */}
        <div className="flex gap-2">
          <StatPill label="New" count={newCount} color="var(--color-accent)" bg="var(--color-accent-soft)" />
          <StatPill label="Learning" count={learningCount} color="var(--color-warning)" bg="var(--color-warning-soft)" />
          <StatPill label="Mastered" count={masteredCount} color="var(--color-success)" bg="var(--color-success-soft)" />
        </div>

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

        {/* Import Cards */}
        <button
          onClick={() => setModal({ mode: 'import' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
        >
          <Upload size={13} />
          Import
        </button>

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

      {/* Import success message */}
      {importMessage && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: 'var(--color-success-soft)',
            color: 'var(--color-success)',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <span>✓</span>
          <span>{importMessage}</span>
        </div>
      )}

      {/* Inline form for create/edit */}
      {(modal.mode === 'create' || modal.mode === 'edit') && (
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

      {/* Import modal */}
      {modal.mode === 'import' && (
        <div
          className="rounded-2xl p-5"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Import Cards
            </h3>
            <button
              onClick={() => setModal({ mode: 'none' })}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            className="input-base w-full px-3 py-2.5 rounded-xl text-sm leading-relaxed mb-3"
            style={{ resize: 'vertical' }}
            placeholder={'One card per line: Front | Back\nExample: What is React? | A JavaScript library for building UIs\nWhat is a Hook? | Functions that let you use React state and features'}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {importText.trim()
                ? `${importText.split('\n').filter((l) => l.includes(' | ')).length} valid card(s) detected`
                : 'Paste your cards above'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setModal({ mode: 'none' }); setImportText(''); }}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim() || createCard.isPending}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                onMouseEnter={(e) => {
                  if (importText.trim()) e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
              >
                {createCard.isPending ? 'Importing…' : 'Import Cards'}
              </button>
            </div>
          </div>
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
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
              >
                <Plus size={14} />
                Add Card
              </button>
            </>
          )}
        </div>
      )}

      {/* Card grid — 2 columns */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((card) => {
            const isHovered = hoveredId === card.id;
            const isRevealed = revealedIds.has(card.id);
            const statusCfg = STATUS_CONFIG[card.status];

            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredId(card.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative flex flex-col gap-3 p-4 rounded-2xl transition-all"
                style={{
                  backgroundColor: isHovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${isHovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
                  boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Status badge — top right */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {/* Action buttons on hover */}
                  <div
                    className="flex gap-1 transition-all duration-150"
                    style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none' }}
                  >
                    <button
                      onClick={() => setModal({ mode: 'edit', card })}
                      className="p-1.5 rounded-lg transition-colors"
                      title="Edit card"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(card)}
                      className="p-1.5 rounded-lg transition-colors"
                      title="Delete card"
                      style={{ color: 'var(--color-danger)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <span
                    className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: statusCfg.bgVar,
                      color: statusCfg.colorVar,
                    }}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                {/* Front — always visible */}
                <div
                  className="pr-24 cursor-pointer"
                  onClick={() => toggleReveal(card.id)}
                >
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{
                      color: 'var(--color-text-primary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {card.front}
                  </p>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

                {/* Back — blurred by default, click to reveal */}
                <div
                  className="cursor-pointer"
                  onClick={() => toggleReveal(card.id)}
                  title={isRevealed ? 'Click to hide answer' : 'Click to reveal answer'}
                >
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: 'var(--color-text-secondary)',
                      filter: isRevealed ? 'none' : 'blur(5px)',
                      transition: 'filter 0.2s ease',
                      userSelect: isRevealed ? 'text' : 'none',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {card.back}
                  </p>
                  {!isRevealed && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Click to reveal
                    </p>
                  )}
                </div>

                {/* Tags */}
                {card.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-auto">
                    {card.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {card.tags.length > 4 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        +{card.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}
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
