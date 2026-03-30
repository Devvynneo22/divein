import { useState } from 'react';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import { ArrowLeft, Plus, Brain, Play } from 'lucide-react';
import {
  useDecks,
  useCreateDeck,
  useUpdateDeck,
  useCards,
  useDeckStats,
  useStudyQueue,
} from './hooks/useFlashcards';
import { DeckCard } from './components/DeckCard';
import { DeckForm } from './components/DeckForm';
import { CardList } from './components/CardList';
import { StudySession } from './components/StudySession';
import type { Deck, CreateDeckInput, UpdateDeckInput } from '@/shared/types/flashcard';

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'decks' | 'cards' | 'study';

// ─── DeckCard + stats wrapper ─────────────────────────────────────────────────

function DeckCardWithStats({
  deck,
  onSelect,
  onStudy,
}: {
  deck: Deck;
  onSelect: () => void;
  onStudy: () => void;
}) {
  const { data: stats } = useDeckStats(deck.id);
  return (
    <DeckCard
      deck={deck}
      stats={stats}
      onClick={onSelect}
      onStudy={(e) => {
        e.stopPropagation();
        onStudy();
      }}
    />
  );
}

// ─── Deck View ────────────────────────────────────────────────────────────────

interface DeckViewProps {
  deck: Deck;
  initialView?: 'cards' | 'study';
  onBack: () => void;
}

function DeckView({ deck, initialView = 'cards', onBack }: DeckViewProps) {
  const [view, setView] = useState<'cards' | 'study'>(initialView);
  const { data: cards = [] } = useCards(deck.id);
  const { data: studyQueue = [] } = useStudyQueue(deck.id);
  const updateDeck = useUpdateDeck();

  function handleSaveDeck(data: CreateDeckInput | UpdateDeckInput) {
    updateDeck.mutate({ id: deck.id, data: data as UpdateDeckInput });
  }

  const accentColor = deck.color ?? '#3b82f6';

  return (
    <div className="flex flex-col h-full">
      {/* ── Deck header ── */}
      <div
        className="px-8 pt-7 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Back nav */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm mb-5 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <ArrowLeft size={15} />
          All Decks
        </button>

        <div className="flex items-start justify-between gap-4">
          {/* Title + description */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Brain size={20} style={{ color: accentColor }} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-2xl font-bold truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {deck.name}
              </h1>
              {deck.description && (
                <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {deck.description}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {view === 'cards' ? (
              <button
                onClick={() => setView('study')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ backgroundColor: accentColor }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Play size={14} fill="white" />
                Study
              </button>
            ) : (
              <button
                onClick={() => setView('cards')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
              >
                View Cards
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {view === 'cards' ? (
          <CardList
            deckId={deck.id}
            cards={cards}
            onStudyAll={() => setView('study')}
          />
        ) : (
          <StudySession
            deckId={deck.id}
            queue={studyQueue}
            deckColor={deck.color}
            deckName={deck.name}
            onExit={() => setView('cards')}
          />
        )}
      </div>
    </div>
  );
}

// ─── Modal overlay ─────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-popup)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function FlashcardsPage() {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [initialDeckView, setInitialDeckView] = useState<'cards' | 'study'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: decks = [], isLoading } = useDecks();
  const createDeck = useCreateDeck();

  function handleCreateDeck(input: CreateDeckInput | UpdateDeckInput) {
    createDeck.mutate(input as CreateDeckInput, {
      onSuccess: () => setShowCreateModal(false),
    });
  }

  // ── Deck view ──────────────────────────────────────────────────────────────
  if (selectedDeck) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <DeckView
            deck={selectedDeck}
            initialView={initialDeckView}
            onBack={() => {
              setSelectedDeck(null);
              setInitialDeckView('cards');
            }}
          />
        </div>
      </div>
    );
  }

  // ── Deck browser ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Flashcards
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Spaced repetition for lasting knowledge
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{ backgroundColor: 'var(--color-accent)', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
            >
              <Plus size={15} />
              New Deck
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {isLoading ? (
            <LoadingSpinner text="Loading flashcards…" />
          ) : decks.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
              >
                <span style={{ fontSize: '2.5rem' }}>🧠</span>
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Create your first deck
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Start building your knowledge with spaced repetition
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ backgroundColor: 'var(--color-accent)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
              >
                <Plus size={15} />
                New Deck
              </button>
            </div>
          ) : (
            /* ── Deck grid ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {decks.map((deck) => (
                <DeckCardWithStats
                  key={deck.id}
                  deck={deck}
                  onSelect={() => {
                    setInitialDeckView('cards');
                    setSelectedDeck(deck);
                  }}
                  onStudy={() => {
                    setInitialDeckView('study');
                    setSelectedDeck(deck);
                  }}
                />
              ))}
              {/* Add new deck tile */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl py-12 border-2 border-dashed text-sm transition-all"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                  minHeight: '180px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.color = 'var(--color-accent)';
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Plus size={22} />
                <span>New Deck</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Create deck modal ── */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text-primary)' }}>
            Create New Deck
          </h2>
          <DeckForm
            onSave={handleCreateDeck}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createDeck.isPending}
          />
        </Modal>
      )}
    </>
  );
}
